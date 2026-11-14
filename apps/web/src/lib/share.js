import { isNative } from './platform.js'

// Share a link with the phone's own share sheet (WhatsApp, Messages,
// Instagram…), falling back to copying the link.
//
// In the apps this goes through Capacitor's Share plugin: Android's WebView has
// no navigator.share at all, so without it tapping Share only ever copied the
// link. Browsers use navigator.share where they have it (phones, Safari, Edge)
// and the clipboard elsewhere (desktop Chrome and Firefox).
//
// Resolves to 'shared', 'copied' or 'cancelled'. Dismissing the sheet is a
// choice, not an error, so it is not thrown.
export async function shareLink({ title, text, url }) {
  try {
    if (isNative()) {
      const { Share } = await import('@capacitor/share')
      await Share.share({ title, text, url, dialogTitle: 'Share event' })
      return 'shared'
    }
    if (navigator.share) {
      await navigator.share({ title, text, url })
      return 'shared'
    }
  } catch (err) {
    if (isCancel(err)) return 'cancelled'
    // Anything else (no share targets, a plugin failure) still deserves a
    // working outcome, so fall through to copying.
  }
  await navigator.clipboard.writeText(url)
  return 'copied'
}

function isCancel(err) {
  const msg = String(err?.message || err || '').toLowerCase()
  return err?.name === 'AbortError' || msg.includes('cancel')
}

import { isNative } from './platform.js'
import { makeNonce } from './nonce.js'

// Google's own "Sign in with Google" button, for the web only.
//
// The redirect flow (signIn('google')) sends people through Supabase's
// callback, so Google's screen reads "to continue to <project>.supabase.co".
// This button runs in a Google popup on our own page instead and hands back an
// ID token, so Google names whatsonapp.uk — no redirect, and no paid custom
// domain. The token goes to Supabase via signInWithIdToken().
//
// Needs VITE_GOOGLE_CLIENT_ID (the Web OAuth client Supabase already uses) and
// this site listed under that client's Authorized JavaScript origins — see
// docs/google-sign-in-domain.md. Without the variable, or if Google's script
// will not load, the sign-in page falls back to the redirect button.
// The Android app keeps the redirect: this script does not work in a WebView.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export function hasGoogleIdentityButton() {
  return !isNative() && Boolean(CLIENT_ID)
}

let scriptPromise = null

function loadScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => window.google?.accounts?.id ? resolve() : reject(new Error('Google sign-in did not start'))
    s.onerror = () => {
      scriptPromise = null   // let a later visit try again
      s.remove()
      reject(new Error('Could not load Google sign-in'))
    }
    document.head.appendChild(s)
  })
  return scriptPromise
}

// Draws Google's button into `el`. onCredential(idToken, rawNonce) runs when
// someone picks an account.
export async function renderGoogleButton(el, { onCredential }) {
  await loadScript()
  const nonce = await makeNonce()
  window.google.accounts.id.initialize({
    client_id: CLIENT_ID,
    nonce: nonce.hashed,
    callback: response => onCredential(response.credential, nonce.raw),
    ux_mode: 'popup',
    use_fedcm_for_button: true,
  })
  window.google.accounts.id.renderButton(el, {
    theme: 'outline',
    size: 'large',
    shape: 'pill',
    text: 'continue_with',
    logo_alignment: 'center',
    // Google caps the width at 400px and will not stretch to fill.
    width: Math.min(400, Math.round(el.getBoundingClientRect().width)),
  })
}

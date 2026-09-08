import { supabase } from '../lib/supabase.js'
import { isNative, isIOS, authRedirectUrl, emailRedirectUrl } from '../lib/platform.js'

let listeners = []

function notify() {
  listeners.forEach(fn => fn())
}

export function getUser() {
  const raw = localStorage.getItem('whatson_user')
  try { return raw ? JSON.parse(raw) : null } catch { return null }
}

function storeUser(supabaseUser, role = 'customer') {
  if (!supabaseUser) {
    localStorage.removeItem('whatson_user')
    notify()
    return null
  }
  const meta = supabaseUser.user_metadata || {}
  const user = {
    id: supabaseUser.id,
    name: meta.full_name || meta.name || supabaseUser.email,
    email: supabaseUser.email,
    avatar: (meta.full_name || supabaseUser.email || '?').slice(0, 2).toUpperCase(),
    provider: supabaseUser.app_metadata?.provider || 'email',
    role,
  }
  localStorage.setItem('whatson_user', JSON.stringify(user))
  notify()
  return user
}

// Sign in with Google via Supabase OAuth.
//
// On the web this is a plain redirect. In the native app it cannot be: Google
// refuses OAuth requests coming from an embedded WebView (`disallowed_useragent`),
// which is exactly what Capacitor renders the app in. So natively we open the
// consent screen in a Custom Tab — real Chrome, which Google accepts — and pick
// the result back up via the deep link handled in initNativeAuthBridge().
export async function signIn(provider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: authRedirectUrl(),
      // Natively there is no page to navigate away from; we need the URL itself
      // so we can hand it to the Custom Tab.
      skipBrowserRedirect: isNative(),
    },
  })
  if (error) throw error

  if (isNative()) {
    if (!data?.url) throw new Error('No OAuth URL returned')
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url: data.url, presentationStyle: 'popover' })
  }
}

// Sign in with Apple. Two different flows behind one function.
//
// On the web it is an ordinary OAuth redirect, the same as Google. Supabase
// authenticates that against a *Services ID* and a signed client secret, which
// are configured in the Apple provider settings.
//
// On iOS it cannot be: Apple requires the system sheet rather than a web view
// (Guideline 4.8), so the plugin returns an identity token directly and
// Supabase verifies it — no Custom Tab, no deep link. That path identifies the
// app by its *bundle id* instead, which is why the Supabase provider needs both
// the Services ID and the bundle id configured before either works.
//
// Android is not offered it at all; see hasAppleSignIn().
export async function signInWithApple() {
  if (!isIOS()) return signIn('apple')

  // Imported dynamically because it is an iOS native plugin — a static import
  // would pull it into the web and Android bundles, where it cannot run.
  const { SignInWithApple } = await import('@capacitor-community/apple-sign-in')

  // Apple binds the token to a nonce to stop a token issued for one sign-in
  // being replayed into another. Apple is given the SHA-256 hash and embeds it
  // in the token; Supabase is given the original and hashes it to compare. Send
  // the same value to both and every sign-in fails with a nonce mismatch.
  const rawNonce = crypto.randomUUID()
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawNonce))
  const hashedNonce = [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  const result = await SignInWithApple.authorize({
    // The bundle id, not a Services ID — a native sign-in identifies itself as
    // the app. It has to be listed in the Supabase Apple provider's
    // "Authorized Client IDs" or the token is rejected as having a bad audience.
    clientId: 'uk.whatsonapp.app',
    redirectURI: '',   // unused by the native flow, but the plugin requires the key
    scopes: 'email name',
    nonce: hashedNonce,
  })

  const token = result?.response?.identityToken
  if (!token) throw new Error('Apple did not return an identity token')

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token,
    nonce: rawNonce,
  })
  if (error) throw error

  // Apple sends the name only on the very first authorisation, and never again
  // — so if it is not saved now it is lost for good. Supabase does not map it
  // into user_metadata for us the way it does for Google.
  const given = result.response.givenName
  const family = result.response.familyName
  if (given || family) {
    const full = [given, family].filter(Boolean).join(' ')
    await supabase.auth.updateUser({ data: { full_name: full } }).catch(() => {})
  }
}

// Sign in with an existing email + password
export async function signInWithPassword(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

// Create a new account with email + password
// Returns true if a confirmation email was sent (no active session yet)
export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: emailRedirectUrl(),
    },
  })
  if (error) throw error
  // If email confirmation is required, there's a user but no session yet
  return !data.session
}

export async function signOut() {
  await supabase.auth.signOut()
  localStorage.removeItem('whatson_user')
  notify()
}

// Permanently delete the signed-in user.
//
// The database half is delete_own_account() (migration 012), because removing a
// row from auth.users needs privileges the anon key does not have. It is keyed
// on auth.uid(), so there is nothing to pass and no way to aim it at anyone
// else.
//
// Local saved/going sets are not cleared here — savedStore owns those keys, and
// importing it would close an import cycle with this module. The caller clears
// them; see AccountSettingsPage.
// Whether the session just ended because the account was deleted, rather than
// by signing out. Module state rather than router state because clearing the
// user unmounts the settings page mid-call — the authed() wrapper redirects to
// /signin before navigate() gets a chance, so anything passed through the
// router is dropped. Navigation is client-side, so this survives the trip.
let accountDeleted = false
export const wasAccountDeleted = () => accountDeleted
export const clearDeletedNotice = () => { accountDeleted = false }

export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_own_account')
  if (error) throw error
  accountDeleted = true
  // The user this session belongs to no longer exists, so the server side of
  // signOut can legitimately fail. Clearing the local session is what matters.
  await supabase.auth.signOut().catch(() => {})
  localStorage.removeItem('whatson_user')
  notify()
}

// Which of the two apps to open on next sign-in. It is a preference, NOT the
// current mode — that is derived from the URL by useAppMode(). Keeping the two
// apart is what stops the nav claiming you are managing a venue while you are
// looking at the customer map.
export function setPreferredMode(mode) {
  const user = getUser()
  if (!user) return
  const updated = { ...user, role: mode }
  localStorage.setItem('whatson_user', JSON.stringify(updated))
  notify()
}

export function getPreferredMode() {
  return getUser()?.role === 'venue' ? 'venue' : 'customer'
}

export function subscribe(fn) {
  listeners.push(fn)
  return () => { listeners = listeners.filter(l => l !== fn) }
}

// Turn the deep link Android hands back after OAuth into a Supabase session.
//
// Which half of this runs depends on the client's flowType. The client is on
// 'pkce', so it is the 'code' branch that runs; the fragment branch stays for
// anything issued under the old implicit flow that is still in flight.
async function completeNativeAuth(rawUrl) {
  const url = new URL(rawUrl)
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ''))
  const query = url.searchParams

  const errorDescription =
    fragment.get('error_description') || query.get('error_description')
  if (errorDescription) throw new Error(errorDescription)

  const code = query.get('code')
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw error
    return true
  }

  const access_token = fragment.get('access_token')
  const refresh_token = fragment.get('refresh_token')
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error) throw error
    return true
  }

  return false
}

// Registers the native deep-link listener. No-op on the web.
// Returns a cleanup function in both cases so callers don't have to care.
export async function initNativeAuthBridge(onError) {
  if (!isNative()) return () => {}

  const [{ App }, { Browser }] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/browser'),
  ])

  const handle = await App.addListener('appUrlOpen', async ({ url }) => {
    if (!url?.startsWith('uk.whatsonapp.app://auth')) return
    try {
      await completeNativeAuth(url)
    } catch (err) {
      // Without this the Custom Tab just closes and the user is dumped back on
      // the sign-in screen with no explanation.
      onError?.(err)
    } finally {
      // Dismiss the Custom Tab whether or not it worked.
      await Browser.close().catch(() => {})
    }
  })

  return () => handle.remove()
}

// Call this once in App to listen for Supabase auth changes
export function initAuth(onUser) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      const existing = getUser()
      storeUser(session.user, existing?.role || 'customer')
    }
    onUser(getUser())
  })

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      const existing = getUser()
      storeUser(session.user, existing?.role || 'customer')
    } else {
      localStorage.removeItem('whatson_user')
      notify()
    }
    onUser(getUser())
  })

  return () => subscription.unsubscribe()
}

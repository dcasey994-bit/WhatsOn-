import { supabase } from '../lib/supabase.js'
import { isNative, authRedirectUrl, emailRedirectUrl } from '../lib/platform.js'

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

export function setRole(role) {
  const user = getUser()
  if (!user) return
  const updated = { ...user, role }
  localStorage.setItem('whatson_user', JSON.stringify(updated))
  notify()
}

export function subscribe(fn) {
  listeners.push(fn)
  return () => { listeners = listeners.filter(l => l !== fn) }
}

// Turn the deep link Android hands back after OAuth into a Supabase session.
//
// Which half of this runs depends on the client's flowType. supabase-js
// defaults to 'implicit', which returns the tokens in the URL fragment. The
// 'code' branch covers 'pkce' so switching later doesn't silently break sign-in.
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

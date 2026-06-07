import { supabase } from '../lib/supabase.js'

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

// Sign in with Google via Supabase OAuth
export async function signIn(provider) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
    },
  })
  if (error) throw error
}

// Sign in with email — sends a magic link to the inbox
export async function signInWithEmail(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  })
  if (error) throw error
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

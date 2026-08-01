// Turn a Supabase auth failure into something a user can act on.
//
// Previously every failure in the sign-in screen was reported as "Wrong email
// or password", which is wrong often enough to be actively misleading: a bad
// API key, an unconfirmed email and a dropped connection all look identical to
// a mistyped password. The distinctions below all come back from Supabase; we
// were simply discarding them.
export function authErrorMessage(err, { isSignUp = false } = {}) {
  const raw = (err?.message || '').toLowerCase()

  if (raw.includes('invalid login credentials')) {
    return 'Wrong email or password. Please try again.'
  }
  if (raw.includes('email not confirmed')) {
    return 'Please confirm your email address first — check your inbox.'
  }
  if (raw.includes('user already registered') || raw.includes('already been registered')) {
    return 'That email already has an account. Try signing in instead.'
  }
  // A rejected or missing anon key. Nothing the user can do, but saying so
  // beats sending them round in circles retyping a correct password.
  if (raw.includes('invalid api key') || raw.includes('no api key')) {
    return 'The app is not configured correctly and cannot reach the server.'
  }
  if (
    raw.includes('failed to fetch') ||
    raw.includes('network') ||
    raw.includes('load failed')
  ) {
    return 'Could not reach the server. Check your connection and try again.'
  }
  if (raw.includes('rate limit') || raw.includes('too many requests')) {
    return 'Too many attempts. Please wait a minute and try again.'
  }

  // Unrecognised: show what the server actually said rather than inventing a
  // reason. An odd-looking message is more useful than a confidently wrong one.
  if (err?.message) return err.message
  return isSignUp
    ? 'Could not create the account. Please try again.'
    : 'Could not sign in. Please try again.'
}

import { getUser } from './authStore.js'

// Gate an action behind sign-in. Returns true if the user is signed in;
// otherwise sends them to the sign-in page (remembering where they were)
// and returns false so the caller can bail out.
export function ensureSignedIn(navigate) {
  if (getUser()) return true
  navigate('/signin', { state: { from: window.location.pathname } })
  return false
}

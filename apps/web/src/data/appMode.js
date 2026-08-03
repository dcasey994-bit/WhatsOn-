import { useLocation } from 'react-router-dom'

// WhatsOn? is two apps sharing a shell: "going out" for customers and
// "my venue" for venue teams. Which one you are in is decided by the URL and
// nothing else.
//
// It used to be decided by a value in localStorage that only changed when
// someone pressed the mode switch. Pressing back out of a venue page moved the
// URL to /discover but left the stored value on 'venue', so the nav and the
// account menu claimed you were still managing a venue while you looked at the
// customer map.
//
// Venue management lives under its own prefix so this stays a single
// startsWith rather than a list of paths to keep in step. Note /venue/:id is
// the *public* venue page a customer sees — it is not management, and giving
// management its own root is what keeps those apart.
export const VENUE_ROOT = '/manage'

export function isVenuePath(pathname) {
  return pathname === VENUE_ROOT || pathname.startsWith(`${VENUE_ROOT}/`)
}

// 'venue' | 'customer' — where the user is right now.
export function useAppMode() {
  const { pathname } = useLocation()
  return isVenuePath(pathname) ? 'venue' : 'customer'
}

// Where each mode starts. Used by the mode switch and by sign-in.
export function homePathFor(mode) {
  return mode === 'venue' ? VENUE_ROOT : '/discover'
}

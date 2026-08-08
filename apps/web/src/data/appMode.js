import { useLocation, useNavigate } from 'react-router-dom'

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

// The venues a user manages, under their own segment rather than hanging off
// the root — /manage/events/* already sat one level down, so a bare /manage/:id
// left venue pages as the odd ones out and blocked any future static segment
// from being added at that level.
export const VENUE_HOME = `${VENUE_ROOT}/venues`
export const venuePath = id => `${VENUE_HOME}/${id}`
export const NEW_VENUE_PATH = `${VENUE_HOME}/new`

// 'venue' | 'customer' — where the user is right now.
export function useAppMode() {
  const { pathname } = useLocation()
  return isVenuePath(pathname) ? 'venue' : 'customer'
}

// The public event and venue pages are reachable from both sides: as
// themselves, and under /manage/preview as a preview for the venue team. A
// link between them has to stay on whichever side it was followed from, or
// the preview quietly hands the owner back to the customer app.
export function publicPath(pathname, path) {
  return isVenuePath(pathname) ? `${VENUE_ROOT}/preview${path}` : path
}

// ── Going out: /going-out/<view>/<page> ────────────────────────────────────
//
// The customer app is one grid: two things to look at (events, venues) across
// three ways of looking (map, list, saved). Both axes live in the URL for the
// same reason the app mode does — the events/venues toggle used to be a piece
// of page state, so it reset on every tab change and each page disagreed with
// the last. Reading it from the path makes one toggle out of three, and makes
// a view someone lands on the view they were sent.
export const GOING_OUT_ROOT = '/going-out'
export const VIEWS = ['events', 'venues']
export const PAGES = ['discover', 'browse', 'saved']

export function goingOutPath(view, page) {
  return `${GOING_OUT_ROOT}/${view}/${page}`
}

// Unrecognised segments fall back rather than 404, so a hand-typed or stale
// URL lands somewhere sensible instead of bouncing to the catch-all.
export function parseGoingOut(pathname) {
  const [, root, view, page] = pathname.split('/')
  if (`/${root}` !== GOING_OUT_ROOT) return null
  return {
    view: VIEWS.includes(view) ? view : 'events',
    page: PAGES.includes(page) ? page : 'discover',
  }
}

// 'events' | 'venues' — what the current page is showing.
export function useView() {
  return parseGoingOut(useLocation().pathname)?.view ?? 'events'
}

// Switches between events and venues without leaving the page you are on.
export function useSwitchView() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const page = parseGoingOut(pathname)?.page ?? 'discover'
  return view => navigate(goingOutPath(view, page))
}

// Where each mode starts. Used by the mode switch and by sign-in.
export function homePathFor(mode) {
  return mode === 'venue' ? VENUE_HOME : goingOutPath('events', 'discover')
}

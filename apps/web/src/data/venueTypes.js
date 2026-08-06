// Shared so the register and edit forms can never drift apart. If they did,
// editing a venue could silently change its type to whichever option the
// select happened to fall back to.
export const VENUE_TYPES = [
  'Pub', 'Bar', 'Club', 'Theatre', 'Comedy Club', 'Restaurant', 'Other',
]

// Types we no longer offer, mapped to the one that replaced them. A pub that
// puts bands on is still a pub, and what a venue *is* is a better filter than
// what it happens to programme — the events themselves already carry that.
//
// Migration 008 rewrites the stored rows, so this only covers anything written
// before it runs.
const RETIRED_TYPES = {
  'Pub & Live Music Venue': 'Pub',
  'Live Music Venue':       'Bar',
}

// Always returns the type the app still offers, so callers can display or
// colour it without checking whether it has since been retired.
export function resolveVenueType(type) {
  return RETIRED_TYPES[type] || type
}

// Map pin colour per venue type. Only pubs are being listed for now, so in
// practice the map is green — the rest are here so adding a bar or a club
// later needs no code change.
//
// These are deliberately independent of the event category colours: the map
// shows either events or venues, never both, so the two palettes never appear
// side by side and can each use the clearest colours available.
export const VENUE_TYPE_COLORS = {
  'Pub':          '#00c853',
  'Bar':          '#ff4081',
  'Club':         '#aa00ff',
  'Theatre':      '#ff6d00',
  'Comedy Club':  '#ffab00',
  'Restaurant':   '#8d6e63',
  'Other':        '#78909c',
}

const UNKNOWN_TYPE_COLOR = VENUE_TYPE_COLORS.Other

// Venues seeded or registered before a type existed, and any legacy type with
// no mapping, fall back to the neutral grey rather than vanishing.
export function getVenueTypeColor(type) {
  return VENUE_TYPE_COLORS[resolveVenueType(type)] || UNKNOWN_TYPE_COLOR
}

// A retired type resolves to its replacement rather than being offered back,
// which is the one case where rewriting the stored value on save is the point.
// Anything else unrecognised is still kept, so opening the edit form on a
// venue predating the list never silently changes it.
export function venueTypeOptions(currentType) {
  const type = resolveVenueType(currentType)
  return type && !VENUE_TYPES.includes(type)
    ? [type, ...VENUE_TYPES]
    : VENUE_TYPES
}

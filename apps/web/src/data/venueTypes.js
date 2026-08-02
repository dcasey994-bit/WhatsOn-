// Shared so the register and edit forms can never drift apart. If they did,
// editing a venue could silently change its type to whichever option the
// select happened to fall back to.
export const VENUE_TYPES = [
  'Pub', 'Pub & Live Music Venue', 'Live Music Venue', 'Bar', 'Club',
  'Theatre', 'Comedy Club', 'Restaurant', 'Other',
]

// Map pin colour per venue type. Only pubs are being listed for now, so in
// practice the map is green — the rest are here so adding a bar or a club
// later needs no code change.
//
// These are deliberately independent of the event category colours: the map
// shows either events or venues, never both, so the two palettes never appear
// side by side and can each use the clearest colours available.
export const VENUE_TYPE_COLORS = {
  'Pub':                     '#00c853',
  'Pub & Live Music Venue':  '#00bfa5',
  'Live Music Venue':        '#2979ff',
  'Bar':                     '#ff4081',
  'Club':                    '#aa00ff',
  'Theatre':                 '#ff6d00',
  'Comedy Club':             '#ffab00',
  'Restaurant':              '#8d6e63',
  'Other':                   '#78909c',
}

const UNKNOWN_TYPE_COLOR = VENUE_TYPE_COLORS.Other

// Venues seeded or registered before a type existed, and any legacy type not
// in the list, fall back to the neutral grey rather than vanishing.
export function getVenueTypeColor(type) {
  return VENUE_TYPE_COLORS[type] || UNKNOWN_TYPE_COLOR
}

// Includes the venue's existing type even if it predates the list, so opening
// the edit form never silently rewrites it.
export function venueTypeOptions(currentType) {
  return currentType && !VENUE_TYPES.includes(currentType)
    ? [currentType, ...VENUE_TYPES]
    : VENUE_TYPES
}

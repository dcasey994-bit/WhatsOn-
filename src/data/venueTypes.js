// Shared so the register and edit forms can never drift apart. If they did,
// editing a venue could silently change its type to whichever option the
// select happened to fall back to.
export const VENUE_TYPES = [
  'Pub', 'Pub & Live Music Venue', 'Live Music Venue', 'Bar', 'Club',
  'Theatre', 'Comedy Club', 'Restaurant', 'Other',
]

// Includes the venue's existing type even if it predates the list, so opening
// the edit form never silently rewrites it.
export function venueTypeOptions(currentType) {
  return currentType && !VENUE_TYPES.includes(currentType)
    ? [currentType, ...VENUE_TYPES]
    : VENUE_TYPES
}

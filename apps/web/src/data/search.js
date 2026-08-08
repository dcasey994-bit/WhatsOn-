// Free-text matching for the search bar. Kept out of the component file so it
// can be imported without dragging a component along with it.
import { resolveVenueType } from './venueTypes.js'

// Match a venue against a free-text query (name, address, type). The type is
// resolved first so searching "pub" still finds a venue whose stored type was
// retired.
export function matchesVenueQuery(venue, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    venue.name?.toLowerCase().includes(q) ||
    venue.address?.toLowerCase().includes(q) ||
    resolveVenueType(venue.type)?.toLowerCase().includes(q)
  )
}

// Match an event against a free-text query (name, venue, category label)
export function matchesQuery(event, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    event.name?.toLowerCase().includes(q) ||
    event.venue?.toLowerCase().includes(q) ||
    event.category?.toLowerCase().includes(q)
  )
}

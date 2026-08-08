import { useState, useEffect, useMemo, useCallback } from 'react'
import { useEvents, useEventsError, useEventsLoading, useReloadEvents } from '../data/EventsContext.jsx'
import { fetchAllVenues } from '../data/eventsStore.js'
import { matchesDay, todayKey } from '../data/dateFilter.js'
import { resolveVenueType, VENUE_TYPES } from '../data/venueTypes.js'
import { useView, useSwitchView } from '../data/appMode.js'
import Header from '../components/Header.jsx'
import ViewToggle from '../components/ViewToggle.jsx'
import CategoryFilter from '../components/CategoryFilter.jsx'
import VenueTypeFilter from '../components/VenueTypeFilter.jsx'
import DayStrip from '../components/DayStrip.jsx'
import EventCard from '../components/EventCard.jsx'
import VenueCard from '../components/VenueCard.jsx'
import SearchBar from '../components/SearchBar.jsx'
import { matchesQuery, matchesVenueQuery } from '../data/search.js'
import ErrorBanner from '../components/ErrorBanner.jsx'
import './BrowsePage.css'

export default function BrowsePage() {
  const events = useEvents()
  const eventsError = useEventsError()
  const eventsLoading = useEventsLoading()
  const reloadEvents = useReloadEvents()
  const mode = useView()
  const switchView = useSwitchView()
  const [category, setCategory] = useState('all')
  const [venueType, setVenueType] = useState('all')
  const [day, setDay] = useState(() => todayKey())
  const [query, setQuery] = useState('')
  const [venues, setVenues] = useState([])
  const [venuesError, setVenuesError] = useState(false)
  const [venuesLoading, setVenuesLoading] = useState(true)

  // Only fetched once the venues view is opened — someone who only ever
  // browses events never pays for it.
  const loadVenues = useCallback(() => {
    fetchAllVenues()
      .then(vs => { setVenues(vs); setVenuesError(false) })
      .catch(() => setVenuesError(true))
      .finally(() => setVenuesLoading(false))
  }, [])

  useEffect(() => { if (mode === 'venues') loadVenues() }, [mode, loadVenues])

  const filtered = events.filter(e =>
    (category === 'all' || e.category === category) &&
    matchesDay(e, day) &&
    matchesQuery(e, query)
  )
  const sorted = [...filtered].sort((a, b) =>
    (a.startsAt || a.time).localeCompare(b.startsAt || b.time)
  )

  // Same rule as the map: offer only the types the loaded venues actually
  // use, so no chip empties the list.
  const venueTypesPresent = useMemo(() => {
    const present = new Set(venues.map(v => resolveVenueType(v.type)))
    return VENUE_TYPES.filter(t => present.has(t))
  }, [venues])

  const filteredVenues = useMemo(() => venues
    .filter(v => venueType === 'all' || resolveVenueType(v.type) === venueType)
    .filter(v => matchesVenueQuery(v, query))
    .sort((a, b) => a.name.localeCompare(b.name)),
    [venues, venueType, query]
  )

  // Upcoming events per venue, for the count on each card.
  const eventsPerVenue = useMemo(() => {
    const counts = new Map()
    for (const e of events) if (e.venueId) counts.set(e.venueId, (counts.get(e.venueId) ?? 0) + 1)
    return counts
  }, [events])

  const showingVenues = mode === 'venues'
  const count = showingVenues ? filteredVenues.length : filtered.length
  const noun = showingVenues
    ? (count === 1 ? 'venue' : 'venues')
    : (count === 1 ? 'event' : 'events')

  return (
    <div className="browse-page">
      <Header>
        <span className="event-count">{count} {noun}</span>
      </Header>
      <ViewToggle mode={mode} onChange={switchView} />
      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder={showingVenues ? 'Search venues…' : 'Search events…'}
      />

      {showingVenues ? (
        <VenueTypeFilter types={venueTypesPresent} active={venueType} onChange={setVenueType} />
      ) : (
        <>
          <DayStrip active={day} onChange={setDay} />
          <CategoryFilter active={category} onChange={setCategory} />
        </>
      )}

      {!showingVenues && eventsError && (
        <ErrorBanner message="Couldn't load events. Check your connection." onRetry={reloadEvents} />
      )}
      {showingVenues && venuesError && (
        <ErrorBanner message="Couldn't load venues. Check your connection." onRetry={loadVenues} />
      )}

      <div className="browse-list">
        {showingVenues ? (
          venuesLoading ? (
            <p className="browse-status">Loading venues…</p>
          ) : filteredVenues.length === 0 && !venuesError ? (
            <div className="browse-empty">
              <p className="browse-empty-title">No venues found</p>
              <p className="browse-empty-sub">
                {query.trim() ? 'Try a different search.' : 'Nothing listed here yet.'}
              </p>
            </div>
          ) : (
            filteredVenues.map(venue => (
              <VenueCard key={venue.id} venue={venue} eventCount={eventsPerVenue.get(venue.id) ?? 0} />
            ))
          )
        ) : eventsLoading ? (
          <p className="browse-status">Loading events…</p>
        ) : sorted.length === 0 && !eventsError ? (
          <div className="browse-empty">
            <p className="browse-empty-title">Nothing on this day</p>
            <p className="browse-empty-sub">
              {query.trim()
                ? 'Try a different search, or another day.'
                : 'Try another day or category.'}
            </p>
          </div>
        ) : (
          sorted.map(event => (
            <EventCard key={event.id} event={event} />
          ))
        )}
      </div>
    </div>
  )
}

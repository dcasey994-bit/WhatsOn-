import { useState } from 'react'
import { useEvents, useEventsError, useReloadEvents } from '../data/EventsContext.jsx'
import { matchesDay, todayKey } from '../data/dateFilter.js'
import Header from '../components/Header.jsx'
import CategoryFilter from '../components/CategoryFilter.jsx'
import DayStrip from '../components/DayStrip.jsx'
import EventCard from '../components/EventCard.jsx'
import SearchBar, { matchesQuery } from '../components/SearchBar.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import './BrowsePage.css'

export default function BrowsePage() {
  const events = useEvents()
  const eventsError = useEventsError()
  const reloadEvents = useReloadEvents()
  const [category, setCategory] = useState('all')
  const [day, setDay] = useState(() => todayKey())
  const [query, setQuery] = useState('')

  const filtered = events.filter(e =>
    (category === 'all' || e.category === category) &&
    matchesDay(e, day) &&
    matchesQuery(e, query)
  )
  const sorted = [...filtered].sort((a, b) =>
    (a.startsAt || a.time).localeCompare(b.startsAt || b.time)
  )

  return (
    <div className="browse-page">
      <Header>
        <span className="event-count">{filtered.length} {filtered.length === 1 ? 'event' : 'events'}</span>
      </Header>
      <SearchBar value={query} onChange={setQuery} />
      <DayStrip active={day} onChange={setDay} />
      <CategoryFilter active={category} onChange={setCategory} />
      {eventsError && (
        <ErrorBanner message="Couldn't load events. Check your connection." onRetry={reloadEvents} />
      )}
      <div className="browse-list">
        {sorted.map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  )
}

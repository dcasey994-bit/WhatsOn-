import { useState } from 'react'
import { useEvents } from '../data/EventsContext.jsx'
import { matchesDate } from '../data/dateFilter.js'
import Header from '../components/Header.jsx'
import CategoryFilter from '../components/CategoryFilter.jsx'
import DateFilter from '../components/DateFilter.jsx'
import EventCard from '../components/EventCard.jsx'
import './BrowsePage.css'

export default function BrowsePage() {
  const events = useEvents()
  const [category, setCategory] = useState('all')
  const [dateRange, setDateRange] = useState('tonight')

  const filtered = events.filter(e =>
    (category === 'all' || e.category === category) && matchesDate(e, dateRange)
  )
  const sorted = [...filtered].sort((a, b) =>
    (a.startsAt || a.time).localeCompare(b.startsAt || b.time)
  )

  return (
    <div className="browse-page">
      <Header>
        <span className="event-count">{filtered.length} {filtered.length === 1 ? 'event' : 'events'}</span>
      </Header>
      <DateFilter active={dateRange} onChange={setDateRange} />
      <CategoryFilter active={category} onChange={setCategory} />
      <div className="browse-list">
        {sorted.map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  )
}

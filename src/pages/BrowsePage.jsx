import { useState } from 'react'
import { useEvents } from '../data/EventsContext.jsx'
import Header from '../components/Header.jsx'
import CategoryFilter from '../components/CategoryFilter.jsx'
import EventCard from '../components/EventCard.jsx'
import './BrowsePage.css'

export default function BrowsePage() {
  const events = useEvents()
  const [category, setCategory] = useState('all')

  const filtered = category === 'all' ? events : events.filter(e => e.category === category)
  const sorted = [...filtered].sort((a, b) =>
    (a.startsAt || a.time).localeCompare(b.startsAt || b.time)
  )

  return (
    <div className="browse-page">
      <Header>
        <span className="event-count">{filtered.length} events tonight</span>
      </Header>
      <CategoryFilter active={category} onChange={setCategory} />
      <div className="browse-list">
        {sorted.map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { EVENTS } from '../data/events.js'
import Header from '../components/Header.jsx'
import CategoryFilter from '../components/CategoryFilter.jsx'
import EventCard from '../components/EventCard.jsx'
import './BrowsePage.css'

export default function BrowsePage() {
  const [category, setCategory] = useState('all')

  const filtered = category === 'all' ? EVENTS : EVENTS.filter(e => e.category === category)
  const sorted = [...filtered].sort((a, b) => a.time.localeCompare(b.time))

  return (
    <div className="browse-page">
      <Header>
        <span className="event-count">{filtered.length} events</span>
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

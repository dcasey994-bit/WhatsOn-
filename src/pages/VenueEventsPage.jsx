import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../data/events.js'
import { fetchMyVenueEvents } from '../data/eventsStore.js'
import Header from '../components/Header.jsx'
import './VenueEventsPage.css'

export default function VenueEventsPage({ period }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchMyVenueEvents(period)
      .then(evs => { if (active) { setEvents(evs); setLoading(false) } })
      .catch(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [period])

  const title = period === 'past' ? 'Past Events' : 'Upcoming Events'

  return (
    <div className="venue-events-page">
      <Header title={title} />
      <div className="ve-body">
        {loading ? (
          <p className="ve-status">Loading…</p>
        ) : events.length === 0 ? (
          <p className="ve-status">No {period} events across your venues.</p>
        ) : (
          events.map(ev => {
            const cat = CATEGORIES[ev.category] || CATEGORIES.music
            const dateLabel = new Date((ev.dateKey || '') + 'T00:00:00').toLocaleDateString('en-GB', {
              weekday: 'short', day: 'numeric', month: 'short',
            })
            return (
              <button key={ev.id} className="ve-row" onClick={() => navigate(`/event/${ev.id}`)}>
                <span className="ve-dot" style={{ background: cat.color }} />
                <div className="ve-info">
                  <p className="ve-name">{ev.name}</p>
                  <p className="ve-venue">{ev.venue}</p>
                  <p className="ve-meta">
                    <span style={{ color: cat.color }}>{cat.label}</span>
                    &nbsp;·&nbsp;{dateLabel}
                    &nbsp;·&nbsp;{ev.time}
                    &nbsp;·&nbsp;{ev.price === 0 ? 'Free' : `£${ev.price}`}
                  </p>
                </div>
                <span className="ve-chevron">›</span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

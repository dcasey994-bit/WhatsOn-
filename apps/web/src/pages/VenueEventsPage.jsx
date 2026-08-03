import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCategory } from '../data/events.js'
import { fetchMyVenueEvents } from '../data/eventsStore.js'
import Header from '../components/Header.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import './VenueEventsPage.css'

export default function VenueEventsPage({ period }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    fetchMyVenueEvents(period)
      .then(evs => { if (active) { setEvents(evs); setLoading(false) } })
      .catch(() => { if (active) { setError(true); setLoading(false) } })
    return () => { active = false }
  }, [period, attempt])

  const title = period === 'past' ? 'Past Events' : 'Upcoming Events'

  return (
    <div className="venue-events-page">
      <Header title={title} />
      <div className="ve-body">
        {loading ? (
          <p className="ve-status">Loading…</p>
        ) : error ? (
          <ErrorBanner
            message="Couldn't load your events. Check your connection."
            onRetry={() => setAttempt(a => a + 1)}
          />
        ) : events.length === 0 ? (
          <p className="ve-status">No {period} events across your venues.</p>
        ) : (
          events.map(ev => {
            const cat = getCategory(ev.category)
            const dateLabel = new Date((ev.dateKey || '') + 'T00:00:00').toLocaleDateString('en-GB', {
              weekday: 'short', day: 'numeric', month: 'short',
            })
            return (
              <button
                key={ev.id}
                className="ve-row"
                // These lists span every venue, and the editor lives on the
                // venue page — so go there and tell it which event to open.
                onClick={() => navigate(`/manage/${ev.venueId}`, { state: { editEventId: ev.id } })}
              >
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

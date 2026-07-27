import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchVenueById, fetchPublicVenueEvents } from '../data/eventsStore.js'
import EventCard from '../components/EventCard.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import './detail-shared.css'
import './VenueProfilePage.css'

export default function VenueProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [venue, setVenue] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    Promise.all([fetchVenueById(id), fetchPublicVenueEvents(id)])
      .then(([v, evs]) => {
        if (!active) return
        setVenue(v)
        setEvents(evs)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError(true)
        setLoading(false)
      })
    return () => { active = false }
  }, [id, attempt])

  if (loading) {
    return (
      <div className="venue-profile detail-shell">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <p className="vp-loading">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="venue-profile detail-shell">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <ErrorBanner
          message="Couldn't load this venue. Check your connection."
          onRetry={() => setAttempt(a => a + 1)}
        />
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="venue-profile detail-shell">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <p className="vp-loading">Venue not found.</p>
      </div>
    )
  }

  return (
    <div className="venue-profile detail-shell">
      {/* Hero */}
      <div className="vp-hero detail-hero-base">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <div className="hero-content">
          {venue.type && <span className="hero-badge vp-type-badge">{venue.type}</span>}
          <h1 className="hero-title">{venue.name}</h1>
        </div>
      </div>

      {/* Body */}
      <div className="detail-body-base">
        <section className="detail-section">
          <h2>Venue Info</h2>
          <div className="detail-row">
            <span className="detail-row-label">Address</span>
            <a
              className="detail-row-value"
              href={`https://maps.google.com/?q=${venue.lat},${venue.lng}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {venue.address}
            </a>
          </div>
          {venue.phone && (
            <div className="detail-row">
              <span className="detail-row-label">Phone</span>
              <a className="detail-row-value" href={`tel:${venue.phone}`}>{venue.phone}</a>
            </div>
          )}
          {venue.website && (
            <div className="detail-row">
              <span className="detail-row-label">Website</span>
              <a
                className="detail-row-value"
                href={venue.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                {venue.website.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
              </a>
            </div>
          )}
          {venue.capacity != null && (
            <div className="detail-row">
              <span className="detail-row-label">Capacity</span>
              <span className="detail-row-value">{venue.capacity.toLocaleString()}</span>
            </div>
          )}
        </section>

        <section className="vp-events-section">
          <h2 className="section-label">
            Events
            <span className="vp-events-count">
              {events.length} upcoming
            </span>
          </h2>
          {events.length === 0 ? (
            <p className="vp-empty">No upcoming events listed yet.</p>
          ) : (
            <div className="vp-events">
              {events.map(event => <EventCard key={event.id} event={event} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

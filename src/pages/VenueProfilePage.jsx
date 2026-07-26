import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchVenueById, fetchPublicVenueEvents } from '../data/eventsStore.js'
import EventCard from '../components/EventCard.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
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
      <div className="venue-profile">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <p className="vp-loading">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="venue-profile">
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
      <div className="venue-profile">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <p className="vp-loading">Venue not found.</p>
      </div>
    )
  }

  return (
    <div className="venue-profile">
      <div className="vp-hero">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <h1 className="vp-name">{venue.name}</h1>
        {venue.type && <p className="vp-type">{venue.type}</p>}
        <a
          className="vp-address"
          href={`https://maps.google.com/?q=${venue.lat},${venue.lng}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          📍 {venue.address}
        </a>
        {venue.phone && <p className="vp-phone">📞 {venue.phone}</p>}
        {venue.website && (
          <a
            className="vp-website"
            href={venue.website}
            target="_blank"
            rel="noopener noreferrer"
          >
            🌐 {venue.website.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
          </a>
        )}
      </div>

      <div className="vp-body">
        <h2 className="vp-heading">
          {events.length} upcoming {events.length === 1 ? 'event' : 'events'}
        </h2>
        {events.length === 0 ? (
          <p className="vp-empty">No upcoming events listed yet.</p>
        ) : (
          events.map(event => <EventCard key={event.id} event={event} />)
        )}
      </div>
    </div>
  )
}

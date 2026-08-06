import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { publicPath } from '../data/appMode.js'
import { getCategory } from '../data/events.js'
import { useEvent } from '../data/EventsContext.jsx'
import { fetchEventById } from '../data/eventsStore.js'
import { isSaved, toggleSaved, isGoing, toggleGoing, subscribe } from '../data/savedStore.js'
import { ensureSignedIn } from '../data/authGate.js'
import './detail-shared.css'
import './EventDetailPage.css'

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const contextEvent = useEvent(id)

  const [fetched, setFetched] = useState(null)
  const [lookupDone, setLookupDone] = useState(false)
  const [saved, setSaved] = useState(() => isSaved(id))
  const [going, setGoing] = useState(() => isGoing(id))
  const [shared, setShared] = useState(false)

  const event = contextEvent || fetched

  // If the event isn't in the live map context (e.g. a past event), fetch it directly
  useEffect(() => {
    if (contextEvent) { setLookupDone(true); return }
    let active = true
    setLookupDone(false)
    fetchEventById(id)
      .then(ev => {
        if (!active) return
        setFetched(ev)
        setLookupDone(true)
      })
      .catch(() => {
        // Without this the page would sit on "Loading…" forever
        if (active) setLookupDone(true)
      })
    return () => { active = false }
  }, [id, contextEvent])

  useEffect(() => {
    return subscribe(() => {
      setSaved(isSaved(id))
      setGoing(isGoing(id))
    })
  }, [id])

  if (!event) {
    return (
      <div className="detail-missing">
        <p>{lookupDone ? 'Event not found' : 'Loading…'}</p>
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
      </div>
    )
  }

  const cat = getCategory(event.category)

  function handleGoing() {
    if (!ensureSignedIn(navigate)) return
    toggleGoing(id)
  }

  function handleSaveToggle() {
    if (!ensureSignedIn(navigate)) return
    toggleSaved(id)
  }

  async function handleShare() {
    const url = `https://whatsonapp.uk/event/${id}`
    const text = `${event.name} at ${event.venue} — ${event.date}, ${event.time}`
    if (navigator.share) {
      await navigator.share({ title: event.name, text, url })
    } else {
      await navigator.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  const heroStyle = event.image
    ? { backgroundImage: `linear-gradient(to top, rgba(15,15,20,0.98) 12%, rgba(15,15,20,0.55) 60%, rgba(15,15,20,0.35)), url(${event.image})` }
    : { background: `linear-gradient(160deg, ${cat.bg} 0%, var(--hero-fade) 70%)` }

  return (
    <div className="detail-page detail-shell">
      {/* Hero */}
      <div
        className={`detail-hero detail-hero-base ${event.image ? 'has-image on-image' : ''}`}
        style={heroStyle}
      >
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <div className="hero-content">
          <span className="hero-badge" style={{ background: cat.bg, color: cat.color }}>
            {cat.label}
          </span>
          <h1 className="hero-title">{event.name}</h1>
        </div>
      </div>

      {/* Body */}
      <div className="detail-body detail-body-base">
        {/* Venue — the whole card opens the venue's page */}
        {event.fromDB && event.venueId ? (
          <button
            className="detail-section venue-card"
            onClick={() => navigate(publicPath(pathname, `/venue/${event.venueId}`))}
          >
            <span className="venue-card-body">
              <span className="section-label">Venue</span>
              <span className="venue-card-name">{event.venue}</span>
              <span className="venue-card-addr">{event.address}</span>
            </span>
            <span className="venue-card-chevron" aria-hidden="true">›</span>
          </button>
        ) : (
          <section className="detail-section">
            <h2>Venue</h2>
            <p className="venue-card-name">{event.venue}</p>
            <p className="venue-card-addr">{event.address}</p>
          </section>
        )}

        {/* Info row */}
        <div className="detail-meta-row">
          <div className="meta-box">
            <span className="meta-box-label">Time</span>
            <span className="meta-box-value">{event.time}</span>
          </div>
          <div className="meta-box">
            <span className="meta-box-label">Price</span>
            <span
              className="meta-box-value"
              style={{ color: event.price === 0 ? 'var(--cat-music)' : 'var(--text)' }}
            >
              {event.price === 0 ? 'Free' : `£${event.price}`}
            </span>
          </div>
          <div className="meta-box">
            <span className="meta-box-label">Distance</span>
            <span className="meta-box-value">{event.distance}</span>
          </div>
        </div>

        {/* Tickets */}
        {event.ticketsLeft !== null ? (
          <div className="tickets-banner">
            <span style={{ color: event.ticketsLeft < 30 ? '#ff6b6b' : 'var(--cat-music)' }}>
              {event.ticketsLeft < 30
                ? `⚡ Only ${event.ticketsLeft} tickets left!`
                : `✓ ${event.ticketsLeft} tickets available`}
            </span>
          </div>
        ) : (
          <div className="tickets-banner">
            <span style={{ color: 'var(--cat-music)' }}>✓ Walk-in — no ticket needed</span>
          </div>
        )}

        {/* Special offer */}
        {event.specialOffer && (
          <div className="offer-banner">
            <span className="offer-tag">🎉 Special Offer</span>
            <p className="offer-text">{event.specialOffer}</p>
          </div>
        )}

        {/* About */}
        <section className="detail-section">
          <h2>About</h2>
          <p>{event.description}</p>
        </section>

        {/* Lineup */}
        {event.lineup && event.lineup.length > 0 && (
          <section className="detail-section">
            <h2>Tonight&apos;s Lineup</h2>
            <ul className="lineup-list">
              {event.lineup.map((act, i) => (
                <li key={i} className="lineup-item">
                  <span className="lineup-dot" style={{ background: cat.color }} />
                  {act}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Artist bio */}
        <section className="detail-section">
          <h2>Artist / Act</h2>
          <p>{event.artist_bio}</p>
        </section>

      </div>

      {/* Sticky CTA */}
      <div className="detail-actions">
        {event.ticket_url ? (
          <a
            href={event.ticket_url}
            target="_blank"
            rel="noopener noreferrer"
            className="going-btn"
          >
            🎟 Get Tickets
          </a>
        ) : (
          <button
            className={`going-btn ${going ? 'active' : ''}`}
            onClick={handleGoing}
          >
            {going ? "✓ I'm Going!" : "🎟 I'm Going"}
          </button>
        )}
        <button
          className={`save-btn ${saved ? 'saved' : ''}`}
          onClick={handleSaveToggle}
          aria-label={saved ? 'Unsave' : 'Save event'}
        >
          {saved ? '♥' : '♡'}
        </button>
        <button
          className={`share-btn ${shared ? 'copied' : ''}`}
          onClick={handleShare}
          aria-label="Share event"
        >
          {shared ? '✓' : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 16V3" />
              <path d="M8 7l4-4 4 4" />
              <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { EVENTS, CATEGORIES } from '../data/events.js'
import { isSaved, toggleSaved, isGoing, toggleGoing, subscribe } from '../data/savedStore.js'
import './EventDetailPage.css'

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const event = EVENTS.find(e => e.id === Number(id))

  const [saved, setSaved] = useState(() => isSaved(Number(id)))
  const [going, setGoing] = useState(() => isGoing(Number(id)))
  const [likes, setLikes] = useState(event?.likes ?? 0)

  useEffect(() => {
    return subscribe(() => {
      setSaved(isSaved(Number(id)))
      setGoing(isGoing(Number(id)))
    })
  }, [id])

  if (!event) return <div className="detail-error">Event not found</div>

  const cat = CATEGORIES[event.category]

  function handleGoing() {
    const wasGoing = isGoing(event.id)
    toggleGoing(event.id)
    setLikes(l => wasGoing ? l - 1 : l + 1)
  }

  return (
    <div className="detail-page">
      <div className="detail-hero" style={{ background: `linear-gradient(135deg, ${cat.bg} 0%, var(--bg) 100%)` }}>
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <div className="hero-content">
          <span className="cat-badge-lg" style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
          <h1 className="detail-title">{event.name}</h1>
          <p className="detail-venue">{event.venue}</p>
          <p className="detail-address">{event.address}</p>
        </div>
      </div>

      <div className="detail-body">
        <div className="detail-meta-row">
          <div className="meta-box">
            <span className="meta-box-label">Time</span>
            <span className="meta-box-value">{event.time}</span>
          </div>
          <div className="meta-box">
            <span className="meta-box-label">Price</span>
            <span className="meta-box-value" style={{ color: event.price === 0 ? '#00ff88' : 'var(--text)' }}>
              {event.price === 0 ? 'Free' : `€${event.price}`}
            </span>
          </div>
          <div className="meta-box">
            <span className="meta-box-label">Distance</span>
            <span className="meta-box-value">{event.distance}</span>
          </div>
        </div>

        {event.ticketsLeft !== null && (
          <div className="tickets-banner" style={{ color: event.ticketsLeft < 30 ? '#ff6b6b' : '#00ff88' }}>
            {event.ticketsLeft < 30
              ? `⚠ Only ${event.ticketsLeft} tickets left!`
              : `✓ ${event.ticketsLeft} tickets available`}
          </div>
        )}
        {event.ticketsLeft === null && (
          <div className="tickets-banner" style={{ color: '#00ff88' }}>✓ Walk-in — no ticket needed</div>
        )}

        <div className="detail-actions">
          <button
            className={`going-btn ${going ? 'active' : ''}`}
            onClick={handleGoing}
          >
            {going ? '✓ I\'m Going!' : 'I\'m Going'}
          </button>
          <button
            className={`save-btn ${saved ? 'saved' : ''}`}
            onClick={() => toggleSaved(event.id)}
          >
            {saved ? '♥' : '♡'}
          </button>
        </div>

        <div className="social-proof">
          <span>❤ {likes} people interested</span>
          <span>👁 {event.views} views</span>
        </div>

        <section className="detail-section">
          <h2>About</h2>
          <p>{event.description}</p>
        </section>

        {event.lineup && event.lineup.length > 0 && (
          <section className="detail-section">
            <h2>Tonight's Lineup</h2>
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

        <section className="detail-section">
          <h2>Artist / Act</h2>
          <p>{event.artist_bio}</p>
        </section>

        <section className="detail-section venue-section">
          <h2>Venue</h2>
          <p className="venue-name">{event.venue}</p>
          <p className="venue-addr">{event.address}</p>
          <p className="venue-cap">Capacity: {event.capacity.toLocaleString()}</p>
        </section>
      </div>
    </div>
  )
}

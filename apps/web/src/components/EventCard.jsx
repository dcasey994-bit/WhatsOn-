import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCategory } from '../data/events.js'
import { isSaved, toggleSaved, subscribe } from '../data/savedStore.js'
import { ensureSignedIn } from '../data/authGate.js'
import './EventCard.css'

export default function EventCard({ event }) {
  const navigate = useNavigate()
  const cat = getCategory(event.category)
  const [saved, setSaved] = useState(() => isSaved(event.id))

  useEffect(() => subscribe(() => setSaved(isSaved(event.id))), [event.id])

  function handleSave(e) {
    e.stopPropagation()
    if (!ensureSignedIn(navigate)) return
    toggleSaved(event.id)
  }

  return (
    <div className="event-card" onClick={() => navigate(`/event/${event.id}`)}>
      {event.image && (
        <div className="card-image" style={{ backgroundImage: `url(${event.image})` }} />
      )}

      <div className="card-header">
        <span className="cat-badge" style={{ background: cat.bg, color: cat.color }}>
          {cat.label}
        </span>
        <button
          className={`heart-btn ${saved ? 'saved' : ''}`}
          onClick={handleSave}
          aria-label={saved ? 'Unsave event' : 'Save event'}
        >
          {saved ? '♥' : '♡'}
        </button>
      </div>

      <h3 className="card-title">{event.name}</h3>
      <p className="card-venue">{event.venue}</p>

      {event.specialOffer && (
        <p className="card-offer">🎉 {event.specialOffer}</p>
      )}

      <div className="card-meta">
        <span className="meta-item">🕐 {event.time}</span>
        {event.distance && <span className="meta-item">📍 {event.distance}</span>}
        <span
          className="meta-price"
          style={{ color: event.price === 0 ? 'var(--cat-music)' : 'var(--text)' }}
        >
          {event.price === 0 ? 'Free' : `£${event.price}`}
        </span>
      </div>

      {event.ticketsLeft !== null && event.ticketsLeft < 30 && (
        <p className="low-tickets">⚡ Only {event.ticketsLeft} tickets left</p>
      )}
    </div>
  )
}

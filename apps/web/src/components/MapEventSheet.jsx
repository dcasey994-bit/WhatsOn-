import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCategory } from '../data/events.js'
import { isSaved, toggleSaved, subscribe } from '../data/savedStore.js'
import { ensureSignedIn } from '../data/authGate.js'
import { formatTimeRange } from '../data/eventTime.js'
import './map-sheet.css'
import './MapEventSheet.css'

export default function MapEventSheet({ event, onClose }) {
  const navigate = useNavigate()
  const [saved, setSaved] = useState(() => event ? isSaved(event.id) : false)

  useEffect(() => {
    if (!event) return
    return subscribe(() => setSaved(isSaved(event.id)))
  }, [event])

  if (!event) return null

  const cat = getCategory(event.category)

  function handleSave(e) {
    e.stopPropagation()
    if (!ensureSignedIn(navigate)) return
    toggleSaved(event.id)
  }

  return (
    <div className="map-sheet">
      <div className="sheet-drag-bar" />

      <div className="sheet-inner">
        <div className="sheet-top-row">
          <span
            className="cat-badge-sm"
            style={{ background: cat.bg, color: cat.color }}
          >
            {cat.label}
          </span>
          <button className="sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <h3 className="sheet-title">{event.name}</h3>
        {event.fromDB && event.venueId ? (
          <button
            className="sheet-venue sheet-venue-link"
            onClick={() => navigate(`/venue/${event.venueId}`)}
          >
            📍 {event.venue} ›
          </button>
        ) : (
          <p className="sheet-venue">📍 {event.venue}</p>
        )}

        {event.specialOffer && (
          <p className="sheet-offer">🎉 {event.specialOffer}</p>
        )}

        <div className="sheet-row">
          <span className="sheet-meta-item">🕐 {formatTimeRange(event.time, event.endTime)}</span>
          {event.distance && <span className="sheet-meta-item">🚶 {event.distance}</span>}
          <span
            className="sheet-price"
            style={{ color: event.price === 0 ? 'var(--cat-music)' : 'var(--text)' }}
          >
            {event.price === 0 ? 'Free' : `£${event.price}`}
          </span>
        </div>

        <div className="sheet-actions">
          <button
            className="sheet-detail-btn"
            onClick={() => navigate(`/event/${event.id}`)}
          >
            View Details
          </button>
          <button
            className={`sheet-save-btn ${saved ? 'saved' : ''}`}
            onClick={handleSave}
            aria-label={saved ? 'Unsave' : 'Save event'}
          >
            {saved ? '♥' : '♡'}
          </button>
        </div>
      </div>
    </div>
  )
}

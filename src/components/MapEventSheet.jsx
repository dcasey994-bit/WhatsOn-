import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../data/events.js'
import { isSaved, toggleSaved, subscribe } from '../data/savedStore.js'
import './MapEventSheet.css'

export default function MapEventSheet({ event, onClose }) {
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!event) return
    setSaved(isSaved(event.id))
    return subscribe(() => setSaved(isSaved(event.id)))
  }, [event])

  if (!event) return null

  const cat = CATEGORIES[event.category]

  function handleSave(e) {
    e.stopPropagation()
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
        <p className="sheet-venue">📍 {event.venue} · {event.address}</p>

        <div className="sheet-row">
          <span className="sheet-meta-item">🕐 {event.time}</span>
          <span className="sheet-meta-item">🚶 {event.distance}</span>
          <span
            className="sheet-price"
            style={{ color: event.price === 0 ? 'var(--cat-music)' : 'var(--text)' }}
          >
            {event.price === 0 ? 'Free' : `€${event.price}`}
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

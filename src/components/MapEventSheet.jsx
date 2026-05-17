import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../data/events.js'
import './MapEventSheet.css'

export default function MapEventSheet({ event, onClose }) {
  const navigate = useNavigate()
  if (!event) return null

  const cat = CATEGORIES[event.category]

  return (
    <div className="map-sheet">
      <button className="sheet-close" onClick={onClose}>✕</button>
      <div className="sheet-inner" onClick={() => navigate(`/event/${event.id}`)}>
        <span className="cat-badge-sm" style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
        <h3 className="sheet-title">{event.name}</h3>
        <p className="sheet-venue">{event.venue} · {event.address}</p>
        <div className="sheet-row">
          <span>🕐 {event.time}</span>
          <span>📍 {event.distance}</span>
          <span className="sheet-price" style={{ color: event.price === 0 ? '#00ff88' : '#e8e8f0' }}>
            {event.price === 0 ? 'Free' : `€${event.price}`}
          </span>
          <span className="sheet-cta">Details →</span>
        </div>
      </div>
    </div>
  )
}

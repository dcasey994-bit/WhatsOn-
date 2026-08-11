import { useNavigate } from 'react-router-dom'
import { getCategory } from '../data/events.js'
import { formatTimeRange } from '../data/eventTime.js'
import './map-sheet.css'
import './MapVenueEventsSheet.css'

// Shown when a map pin covers more than one event at the same venue. Tapping
// straight through to a single event would be a guess about which one the
// person meant, so list them and let them pick.
export default function MapVenueEventsSheet({ group, onClose }) {
  const navigate = useNavigate()
  if (!group) return null

  const { venue, venueId, events } = group

  return (
    <div className="map-sheet">
      <div className="sheet-drag-bar" />

      <div className="sheet-inner">
        <div className="sheet-top-row">
          <span className="mve-count">{events.length} events</span>
          <button className="sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {venueId ? (
          <button
            className="sheet-title mve-venue-link"
            onClick={() => navigate(`/venue/${venueId}`)}
          >
            {venue} ›
          </button>
        ) : (
          <h3 className="sheet-title">{venue}</h3>
        )}

        <ul className="mve-list">
          {events.map(event => {
            const cat = getCategory(event.category)
            return (
              <li key={event.id}>
                <button
                  className="mve-row"
                  onClick={() => navigate(`/event/${event.id}`)}
                >
                  <span className="mve-dot" style={{ background: cat.color }} />
                  <span className="mve-row-main">
                    <span className="mve-row-name">{event.name}</span>
                    <span className="mve-row-meta">{cat.label} · {formatTimeRange(event.time, event.endTime)}</span>
                  </span>
                  <span className="mve-row-price">
                    {event.price === 0 ? 'Free' : `£${event.price}`}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { resolveVenueType } from '../data/venueTypes.js'
import VenueSaveButton from './VenueSaveButton.jsx'
import './map-sheet.css'
import './MapVenueSheet.css'

export default function MapVenueSheet({ venue, eventCount = 0, onClose }) {
  const navigate = useNavigate()

  if (!venue) return null

  return (
    <div className="map-sheet">
      <div className="sheet-drag-bar" />

      <div className="sheet-inner">
        <div className="sheet-top-row">
          <span className="cat-badge-sm venue-sheet-badge">{resolveVenueType(venue.type) || 'Venue'}</span>
          <div className="venue-sheet-top-right">
            <VenueSaveButton venueId={venue.id} />
            <button className="sheet-close" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        <h3 className="sheet-title">{venue.name}</h3>
        <p className="venue-sheet-addr">📍 {venue.address}</p>

        <p className="venue-sheet-count">
          {eventCount === 0
            ? 'No upcoming events listed'
            : `${eventCount} upcoming event${eventCount === 1 ? '' : 's'}`}
        </p>

        <div className="sheet-actions">
          <button
            className="sheet-detail-btn"
            onClick={() => navigate(`/venue/${venue.id}`)}
          >
            View Venue
          </button>
        </div>
      </div>
    </div>
  )
}

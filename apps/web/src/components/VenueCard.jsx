import { useNavigate, useLocation } from 'react-router-dom'
import { publicPath } from '../data/appMode.js'
import { resolveVenueType, getVenueTypeColor } from '../data/venueTypes.js'
import './VenueCard.css'

export default function VenueCard({ venue, eventCount = 0 }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const type = resolveVenueType(venue.type)
  const color = getVenueTypeColor(venue.type)

  return (
    <div
      className="vlist-card"
      onClick={() => navigate(publicPath(pathname, `/venue/${venue.id}`))}
    >
      <div className="vlist-card-top">
        <p className="vlist-card-name">{venue.name}</p>
        {type && (
          // Same dot as the map key, so a venue found in the list and the
          // same venue found on the map are recognisably the same thing.
          <span className="vlist-card-type">
            <span className="vlist-card-dot" style={{ background: color }} />
            {type}
          </span>
        )}
      </div>
      <p className="vlist-card-addr">{venue.address}</p>
      {eventCount > 0 && (
        <p className="vlist-card-events">
          {eventCount} {eventCount === 1 ? 'event' : 'events'} coming up
        </p>
      )}
    </div>
  )
}

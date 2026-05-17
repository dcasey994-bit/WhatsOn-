import { useParams, useNavigate } from 'react-router-dom'
import { EVENTS, CATEGORIES } from '../data/events.js'
import './EventDetailPage.css'

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const event = EVENTS.find(e => e.id === Number(id))

  if (!event) return (
    <div className="detail-missing">
      <p>Event not found</p>
      <button onClick={() => navigate('/')}>← Back</button>
    </div>
  )

  const cat = CATEGORIES[event.category]

  return (
    <div className="detail-page">
      {/* Hero */}
      <div className="detail-hero" style={{ borderBottom: `3px solid ${cat.color}` }}>
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <span className="detail-cat" style={{ color: cat.color }}>{cat.label}</span>
        <h1 className="detail-name">{event.name}</h1>
        <p className="detail-venue">{event.venue} · {event.address}</p>
      </div>

      <div className="detail-body">
        {/* Key info */}
        <div className="info-row">
          <div className="info-box">
            <span className="info-label">Time</span>
            <span className="info-val">{event.time}</span>
          </div>
          <div className="info-box">
            <span className="info-label">Price</span>
            <span className="info-val" style={{ color: event.price === 0 ? '#00ff88' : 'inherit' }}>
              {event.price === 0 ? 'Free' : `€${event.price}`}
            </span>
          </div>
          <div className="info-box">
            <span className="info-label">Distance</span>
            <span className="info-val">{event.distance}</span>
          </div>
        </div>

        {/* About */}
        <section>
          <h2>About</h2>
          <p>{event.description}</p>
        </section>

        {/* Lineup */}
        {event.lineup?.length > 0 && (
          <section>
            <h2>Lineup</h2>
            <ul>
              {event.lineup.map((act, i) => (
                <li key={i}>
                  <span className="lineup-dot" style={{ background: cat.color }} />
                  {act}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Tickets */}
        <div className="ticket-note" style={{ borderColor: cat.color }}>
          {event.ticketsLeft === null
            ? '✓ Free entry — no ticket needed'
            : event.ticketsLeft < 30
              ? `⚡ Only ${event.ticketsLeft} tickets remaining`
              : `✓ ${event.ticketsLeft} tickets available`}
        </div>
      </div>
    </div>
  )
}

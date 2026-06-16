import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import { CATEGORIES } from '../data/events.js'
import { useEvents } from '../data/EventsContext.jsx'
import { isSaved, toggleSaved, subscribe } from '../data/savedStore.js'
import Header from '../components/Header.jsx'
import CategoryFilter from '../components/CategoryFilter.jsx'
import MapEventSheet from '../components/MapEventSheet.jsx'
import './DiscoverPage.css'

const BALHAM = [51.4435, -0.1527]

function FlyTo({ center }) {
  const map = useMap()
  useEffect(() => { map.setView(center, map.getZoom()) }, [center, map])
  return null
}

function EventCardMini({ event }) {
  const navigate = useNavigate()
  const cat = CATEGORIES[event.category]
  const [saved, setSaved] = useState(() => isSaved(event.id))

  useEffect(() => subscribe(() => setSaved(isSaved(event.id))), [event.id])

  function handleSave(e) {
    e.stopPropagation()
    toggleSaved(event.id)
  }

  return (
    <div className="event-card" onClick={() => navigate(`/event/${event.id}`)}>
      <div className="card-header">
        <span className="cat-badge" style={{ background: cat.bg, color: cat.color }}>
          {cat.label}
        </span>
        <button className={`heart-btn ${saved ? 'saved' : ''}`} onClick={handleSave} aria-label="Save event">
          {saved ? '♥' : '♡'}
        </button>
      </div>

      <h3 className="card-title">{event.name}</h3>
      <p className="card-venue">{event.venue}</p>

      <div className="card-meta">
        <span className="meta-item">🕐 {event.time}</span>
        {event.distance && <span className="meta-item">📍 {event.distance}</span>}
        <span className="meta-price" style={{ color: event.price === 0 ? 'var(--cat-music)' : 'var(--text)' }}>
          {event.price === 0 ? 'Free' : `£${event.price}`}
        </span>
      </div>

      {event.ticketsLeft !== null && event.ticketsLeft < 30 && (
        <p className="low-tickets">⚡ Only {event.ticketsLeft} tickets left</p>
      )}
    </div>
  )
}

export default function DiscoverPage() {
  const [view, setView] = useState('map')
  const [category, setCategory] = useState('all')
  const [selected, setSelected] = useState(null)
  const events = useEvents()

  const filtered = category === 'all' ? events : events.filter(e => e.category === category)
  const sorted = [...filtered].sort((a, b) =>
    (a.startsAt || a.time).localeCompare(b.startsAt || b.time)
  )

  function handleCategoryChange(cat) {
    setCategory(cat)
    setSelected(null)
  }

  return (
    <div className="discover-page">
      <Header>
        <span className="tonight-badge">Tonight</span>
      </Header>

      {/* Map / List toggle */}
      <div className="view-toggle-bar">
        <button
          className={`vtoggle-btn ${view === 'map' ? 'active' : ''}`}
          onClick={() => setView('map')}
        >
          <span>🗺</span> Map
        </button>
        <button
          className={`vtoggle-btn ${view === 'list' ? 'active' : ''}`}
          onClick={() => setView('list')}
        >
          <span>☰</span> List
        </button>
      </div>

      <CategoryFilter active={category} onChange={handleCategoryChange} />

      {view === 'map' ? (
        <div className="map-wrapper">
          <MapContainer
            center={BALHAM}
            zoom={14}
            zoomControl={false}
            attributionControl={false}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution=""
            />
            <FlyTo center={BALHAM} />

            {/* User location dot */}
            <CircleMarker
              center={BALHAM}
              radius={8}
              pathOptions={{ color: '#ffee00', fillColor: '#ffee00', fillOpacity: 1, weight: 2 }}
            />

            {filtered.map(event => {
              const cat = CATEGORIES[event.category]
              const isSelected = selected?.id === event.id
              return (
                <CircleMarker
                  key={event.id}
                  center={[event.lat, event.lng]}
                  radius={isSelected ? 15 : 11}
                  pathOptions={{
                    color: '#ffffff',
                    fillColor: cat.color,
                    fillOpacity: isSelected ? 1 : 0.85,
                    weight: isSelected ? 3 : 1.5,
                  }}
                  eventHandlers={{ click: () => setSelected(event) }}
                />
              )
            })}
          </MapContainer>

          <MapEventSheet event={selected} onClose={() => setSelected(null)} />

          <div className="map-legend">
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <span key={key} className="legend-item">
                <span className="legend-dot" style={{ background: cat.color }} />
                {cat.label}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="discover-list">
          <p className="discover-count">{filtered.length} events tonight</p>
          {sorted.map(event => (
            <EventCardMini key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

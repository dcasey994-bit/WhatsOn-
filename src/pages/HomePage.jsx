import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { EVENTS, CATEGORIES } from '../data/events.js'
import './HomePage.css'

const DUBLIN = [53.3498, -6.2603]

const ALL_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'music', label: 'Music' },
  { key: 'comedy', label: 'Comedy' },
  { key: 'karaoke', label: 'Karaoke' },
  { key: 'quiz', label: 'Quiz' },
  { key: 'jazz', label: 'Jazz' },
  { key: 'theatre', label: 'Theatre' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)

  const events = filter === 'all' ? EVENTS : EVENTS.filter(e => e.category === filter)

  return (
    <div className="home">
      {/* Header */}
      <header className="home-header">
        <span className="logo">WhatsOn?</span>
        <span className="tonight">Tonight</span>
      </header>

      {/* Map */}
      <div className="map-area">
        <MapContainer
          center={DUBLIN}
          zoom={14}
          zoomControl={false}
          attributionControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

          {/* You are here */}
          <CircleMarker
            center={DUBLIN}
            radius={7}
            pathOptions={{ color: '#fff', fillColor: '#ffee00', fillOpacity: 1, weight: 2 }}
          />

          {events.map(e => {
            const cat = CATEGORIES[e.category]
            const active = selected?.id === e.id
            return (
              <CircleMarker
                key={e.id}
                center={[e.lat, e.lng]}
                radius={active ? 14 : 10}
                pathOptions={{ color: '#fff', fillColor: cat.color, fillOpacity: active ? 1 : 0.8, weight: active ? 3 : 1.5 }}
                eventHandlers={{ click: () => setSelected(e) }}
              />
            )
          })}
        </MapContainer>

        {/* Pin popup */}
        {selected && (
          <div className="map-popup" onClick={() => navigate(`/event/${selected.id}`)}>
            <div className="popup-top">
              <span className="popup-cat" style={{ color: CATEGORIES[selected.category].color }}>
                {CATEGORIES[selected.category].label}
              </span>
              <button className="popup-close" onClick={e => { e.stopPropagation(); setSelected(null) }}>✕</button>
            </div>
            <p className="popup-name">{selected.name}</p>
            <p className="popup-meta">{selected.venue} · {selected.time} · {selected.price === 0 ? 'Free' : `€${selected.price}`}</p>
            <span className="popup-cta">View details →</span>
          </div>
        )}
      </div>

      {/* Filter chips */}
      <div className="chips">
        {ALL_CATEGORIES.map(({ key, label }) => {
          const color = key === 'all' ? '#00ff88' : CATEGORIES[key]?.color
          return (
            <button
              key={key}
              className={`chip ${filter === key ? 'chip-active' : ''}`}
              style={filter === key ? { borderColor: color, color } : {}}
              onClick={() => { setFilter(key); setSelected(null) }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Event list */}
      <div className="event-list">
        <p className="list-label">{events.length} event{events.length !== 1 ? 's' : ''} near you</p>
        {events.map(e => {
          const cat = CATEGORIES[e.category]
          return (
            <div key={e.id} className="event-row" onClick={() => navigate(`/event/${e.id}`)}>
              <span className="row-dot" style={{ background: cat.color }} />
              <div className="row-info">
                <p className="row-name">{e.name}</p>
                <p className="row-sub">{e.venue} · {e.distance}</p>
              </div>
              <div className="row-right">
                <p className="row-time">{e.time}</p>
                <p className="row-price" style={{ color: e.price === 0 ? '#00ff88' : 'var(--text-muted)' }}>
                  {e.price === 0 ? 'Free' : `€${e.price}`}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

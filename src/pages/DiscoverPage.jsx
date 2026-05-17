import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { EVENTS, CATEGORIES } from '../data/events.js'
import Header from '../components/Header.jsx'
import CategoryFilter from '../components/CategoryFilter.jsx'
import MapEventSheet from '../components/MapEventSheet.jsx'
import './DiscoverPage.css'

const DUBLIN = [53.3498, -6.2603]

function FlyTo({ center }) {
  const map = useMap()
  useEffect(() => { map.setView(center, map.getZoom()) }, [center, map])
  return null
}

export default function DiscoverPage() {
  const [category, setCategory] = useState('all')
  const [selected, setSelected] = useState(null)

  const filtered = category === 'all' ? EVENTS : EVENTS.filter(e => e.category === category)

  return (
    <div className="discover-page">
      <Header>
        <span className="tonight-badge">Tonight</span>
      </Header>
      <CategoryFilter active={category} onChange={cat => { setCategory(cat); setSelected(null) }} />

      <div className="map-wrapper">
        <MapContainer
          center={DUBLIN}
          zoom={14}
          zoomControl={false}
          attributionControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution=""
          />
          <FlyTo center={DUBLIN} />

          {/* User location dot */}
          <CircleMarker
            center={DUBLIN}
            radius={8}
            pathOptions={{ color: '#ffee00', fillColor: '#ffee00', fillOpacity: 1, weight: 2 }}
          />

          {filtered.map(event => {
            const cat = CATEGORIES[event.category]
            return (
              <CircleMarker
                key={event.id}
                center={[event.lat, event.lng]}
                radius={selected?.id === event.id ? 14 : 10}
                pathOptions={{
                  color: cat.color,
                  fillColor: cat.color,
                  fillOpacity: 0.85,
                  weight: selected?.id === event.id ? 3 : 1.5,
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
    </div>
  )
}

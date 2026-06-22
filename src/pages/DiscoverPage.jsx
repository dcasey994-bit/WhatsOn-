import { useState, useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Tooltip, useMap } from 'react-leaflet'
import { divIcon } from 'leaflet'
import { useNavigate } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import { CATEGORIES } from '../data/events.js'
import { useEvents } from '../data/EventsContext.jsx'
import { fetchAllVenues } from '../data/eventsStore.js'
import { useUserLocation } from '../data/location.js'
import { matchesDay, todayKey } from '../data/dateFilter.js'
import Header from '../components/Header.jsx'
import CategoryFilter from '../components/CategoryFilter.jsx'
import DayStrip from '../components/DayStrip.jsx'
import MapEventSheet from '../components/MapEventSheet.jsx'
import './DiscoverPage.css'

const BALHAM = [51.4435, -0.1527]

const userPinIcon = divIcon({
  className: '',
  html: `<svg width="22" height="30" viewBox="0 0 22 30" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 0C4.925 0 0 4.925 0 11c0 8.25 11 19 11 19s11-10.75 11-19C22 4.925 17.075 0 11 0z" fill="#00ff88"/>
    <circle cx="11" cy="11" r="4.5" fill="#0f0f14"/>
  </svg>`,
  iconSize: [22, 30],
  iconAnchor: [11, 30],
})

const venuePinIcon = divIcon({
  className: '',
  html: `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 21 13 21s13-11.25 13-21C26 5.82 20.18 0 13 0z" fill="#ffffff"/>
    <circle cx="13" cy="13" r="5" fill="#0f0f14"/>
  </svg>`,
  iconSize: [26, 34],
  iconAnchor: [13, 34],
})

// Only re-centers when coords genuinely change, not on every render
function FlyToOnce({ lat, lng }) {
  const map = useMap()
  const prevRef = useRef(null)
  useEffect(() => {
    if (prevRef.current?.lat === lat && prevRef.current?.lng === lng) return
    map.setView([lat, lng], map.getZoom())
    prevRef.current = { lat, lng }
  }, [lat, lng, map])
  return null
}

export default function DiscoverPage() {
  const [mapMode, setMapMode] = useState('events')  // 'events' | 'venues'
  const [category, setCategory] = useState('all')
  const [day, setDay] = useState(() => todayKey())
  const [selected, setSelected] = useState(null)
  const [venues, setVenues] = useState([])
  const events = useEvents()
  const { coords } = useUserLocation()
  const navigate = useNavigate()

  useEffect(() => {
    fetchAllVenues().then(setVenues).catch(() => {})
  }, [])

  const center = useMemo(
    () => coords ? [coords.lat, coords.lng] : BALHAM,
    [coords?.lat, coords?.lng]  // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Events on the selected day, matching the chosen category
  const filtered = events.filter(e =>
    (category === 'all' || e.category === category) &&
    matchesDay(e, day)
  )

  function handleCategoryChange(cat) {
    setCategory(cat)
    setSelected(null)
  }

  function switchMode(mode) {
    setMapMode(mode)
    setSelected(null)
  }

  return (
    <div className="discover-page">
      <Header>
        <span className="tonight-badge">Tonight</span>
      </Header>

      {/* Events / Venues toggle */}
      <div className="view-toggle-bar">
        <button
          className={`vtoggle-btn ${mapMode === 'events' ? 'active' : ''}`}
          onClick={() => switchMode('events')}
        >
          <span>📅</span> Events
        </button>
        <button
          className={`vtoggle-btn ${mapMode === 'venues' ? 'active' : ''}`}
          onClick={() => switchMode('venues')}
        >
          <span>🏠</span> Venues
        </button>
      </div>

      {mapMode === 'events' && (
        <>
          <DayStrip active={day} onChange={setDay} />
          <CategoryFilter active={category} onChange={handleCategoryChange} />
        </>
      )}

      <div className="map-wrapper">
        <MapContainer
          center={center}
          zoom={14}
          zoomControl={false}
          attributionControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution=""
          />
          <FlyToOnce lat={center[0]} lng={center[1]} />

          {/* User location pin */}
          <Marker position={center} icon={userPinIcon} />

          {/* Events mode — markers for events on the selected day */}
          {mapMode === 'events' && filtered.map(event => {
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

          {/* Venues mode — pins that open the venue's profile */}
          {mapMode === 'venues' && venues.map(venue => (
            <Marker
              key={venue.id}
              position={[venue.lat, venue.lng]}
              icon={venuePinIcon}
              eventHandlers={{ click: () => navigate(`/venue/${venue.id}`) }}
            >
              <Tooltip direction="top" offset={[0, -32]}>{venue.name}</Tooltip>
            </Marker>
          ))}
        </MapContainer>

        {mapMode === 'events' && (
          <MapEventSheet event={selected} onClose={() => setSelected(null)} />
        )}

        {mapMode === 'events' && (
          <div className="map-legend">
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <span key={key} className="legend-item">
                <span className="legend-dot" style={{ background: cat.color }} />
                {cat.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

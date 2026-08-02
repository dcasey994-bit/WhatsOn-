import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet'
import { divIcon } from 'leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import 'leaflet/dist/leaflet.css'
// Positioning and animation only. The default skin is deliberately not
// imported — it ships pale blue bubbles that clash with the dark map, so the
// cluster and pin styling lives in DiscoverPage.css instead.
import 'leaflet.markercluster/dist/MarkerCluster.css'
import { CATEGORIES, getCategory } from '../data/events.js'
import { useEvents, useEventsError, useEventsLoading, useReloadEvents } from '../data/EventsContext.jsx'
import { fetchAllVenues } from '../data/eventsStore.js'
import { useUserLocation } from '../data/location.js'
import { matchesDay, todayKey } from '../data/dateFilter.js'
import { getVenueTypeColor } from '../data/venueTypes.js'
import { getResolvedTheme, subscribeTheme } from '../data/themeStore.js'
import Header from '../components/Header.jsx'
import CategoryFilter from '../components/CategoryFilter.jsx'
import DayStrip from '../components/DayStrip.jsx'
import MapEventSheet from '../components/MapEventSheet.jsx'
import MapVenueSheet from '../components/MapVenueSheet.jsx'
import MapVenueEventsSheet from '../components/MapVenueEventsSheet.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import './DiscoverPage.css'

const BALHAM = [51.4435, -0.1527]

const TILE_URLS = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
}

const PIN_COLORS = {
  dark:  { accent: '#00ff88', venue: '#ffffff', center: '#0f0f14' },
  light: { accent: '#009955', venue: '#1a1a24', center: '#ffffff' },
}

function makeUserPinIcon(theme) {
  const c = PIN_COLORS[theme]
  return divIcon({
    className: '',
    html: `<svg width="22" height="30" viewBox="0 0 22 30" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 0C4.925 0 0 4.925 0 11c0 8.25 11 19 11 19s11-10.75 11-19C22 4.925 17.075 0 11 0z" fill="${c.accent}"/>
      <circle cx="11" cy="11" r="4.5" fill="${c.center}"/>
    </svg>`,
    iconSize: [22, 30],
    iconAnchor: [11, 30],
  })
}

// Used by both map modes: in events mode one dot per venue with events on the
// selected day, in venues mode one dot per venue coloured by its type.
//
// Events at a venue share the venue's coordinates, so drawing a dot per event
// stacked them perfectly — only the topmost was clickable, and zooming never
// separated them. Hence one dot per venue, with a count.
//
// `color` is null when a venue's events span more than one category. Filling
// the dot with one of them would claim the whole venue is that category, so a
// mixed dot is left unfilled — the count is the honest signal.
function makeDotIcon(theme, color, count) {
  const ring = PIN_COLORS[theme].venue
  const inner = count > 1 ? `<span class="map-dot-count">${count}</span>` : ''
  const mixed = color == null
  return divIcon({
    className: '',
    html: `<div class="map-dot${mixed ? ' map-dot-mixed' : ''}" style="--dot-fill:${color ?? 'transparent'};--dot-ring:${ring}">${inner}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

// Same rule as the pins: a cluster only takes a category colour when every
// event inside it is that category. Anything mixed is left unfilled.
// `catColor` is set on each Marker below and lands in marker.options.
function clusterFill(cluster) {
  const colors = new Set()
  for (const marker of cluster.getAllChildMarkers()) {
    const c = marker.options.catColor
    if (!c) return null            // a mixed pin makes the whole cluster mixed
    colors.add(c)
    if (colors.size > 1) return null
  }
  return colors.size === 1 ? [...colors][0] : null
}

function makeClusterIcon(count, fill) {
  // Bigger clusters read as heavier without becoming finger-sized.
  const size = count < 10 ? 34 : count < 50 ? 40 : 46
  const mixed = fill == null
  return divIcon({
    className: '',
    html: `<div class="map-cluster${mixed ? ' map-cluster-mixed' : ''}" style="--cluster-fill:${fill ?? 'transparent'};width:${size}px;height:${size}px">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// Shared across both map modes.
const CLUSTER_PROPS = {
  iconCreateFunction: cluster => makeClusterIcon(cluster.getChildCount(), clusterFill(cluster)),
  showCoverageOnHover: false,
  // Venues on the same parade (Northcote Road, Balham High Road) should merge
  // when zoomed out but separate readily as you move in.
  maxClusterRadius: 45,
  // Grouping by venue already removes identical coordinates, so this only
  // matters for the rare pair of venues at the same point.
  spiderfyOnMaxZoom: true,
  disableClusteringAtZoom: 17,
}

// Re-renders when the effective light/dark theme changes (toggle or OS setting)
function useResolvedTheme() {
  const [theme, setTheme] = useState(() => getResolvedTheme())
  useEffect(() => subscribeTheme(() => setTheme(getResolvedTheme())), [])
  return theme
}

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
  const [selectedGroup, setSelectedGroup] = useState(null)  // venue with >1 event
  const [selectedVenue, setSelectedVenue] = useState(null)
  const [venues, setVenues] = useState([])
  const [venuesError, setVenuesError] = useState(false)
  const events = useEvents()
  const eventsError = useEventsError()
  const eventsLoading = useEventsLoading()
  const reloadEvents = useReloadEvents()
  const { coords } = useUserLocation()
  const theme = useResolvedTheme()
  const userPinIcon = useMemo(() => makeUserPinIcon(theme), [theme])

  const loadVenues = useCallback(() => {
    fetchAllVenues()
      .then(vs => { setVenues(vs); setVenuesError(false) })
      .catch(() => setVenuesError(true))
  }, [])

  useEffect(() => { loadVenues() }, [loadVenues])

  const center = useMemo(
    () => coords ? [coords.lat, coords.lng] : BALHAM,
    [coords?.lat, coords?.lng]  // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Events on the selected day, matching the chosen category
  const filtered = useMemo(
    () => events.filter(e =>
      (category === 'all' || e.category === category) &&
      matchesDay(e, day)
    ),
    [events, category, day]
  )

  // Collapse to one entry per venue. Where a venue has several events on the
  // day, the pin shows a count and opens a list rather than picking one.
  const venueGroups = useMemo(() => {
    const map = new Map()
    for (const event of filtered) {
      if (event.lat == null || event.lng == null) continue
      const key = event.venueId ?? `${event.lat},${event.lng}`
      const existing = map.get(key)
      if (existing) existing.events.push(event)
      else map.set(key, {
        key,
        lat: event.lat,
        lng: event.lng,
        venue: event.venue,
        venueId: event.venueId,
        events: [event],
      })
    }
    return [...map.values()]
  }, [filtered])

  function handleCategoryChange(cat) {
    setCategory(cat)
    setSelected(null)
    setSelectedGroup(null)
  }

  function switchMode(mode) {
    setMapMode(mode)
    setSelected(null)
    setSelectedGroup(null)
    setSelectedVenue(null)
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
          <DayStrip
            active={day}
            onChange={d => { setDay(d); setSelected(null); setSelectedGroup(null) }}
          />
          <CategoryFilter active={category} onChange={handleCategoryChange} />
        </>
      )}

      {mapMode === 'events' && eventsError && (
        <ErrorBanner message="Couldn't load events. Check your connection." onRetry={reloadEvents} />
      )}
      {mapMode === 'venues' && venuesError && (
        <ErrorBanner message="Couldn't load venues. Check your connection." onRetry={loadVenues} />
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
            key={theme}
            url={TILE_URLS[theme]}
            attribution=""
          />
          <FlyToOnce lat={center[0]} lng={center[1]} />

          {/* User location pin */}
          <Marker position={center} icon={userPinIcon} />

          {/* Events mode — one pin per venue, clustered when they crowd.
              The cluster group is keyed so it rebuilds when the filters change;
              it does not reliably reconcile children in place. */}
          {mapMode === 'events' && (
            <MarkerClusterGroup
              key={`events-${day}-${category}-${theme}`}
              {...CLUSTER_PROPS}
            >
              {venueGroups.map(group => {
                // Compare resolved categories, not raw keys: retired keys are
                // remapped, so 'jazz' and 'music' are one category, as are
                // 'karaoke' and 'comedy'.
                const colors = new Set(group.events.map(e => getCategory(e.category).color))
                const fill = colors.size === 1 ? [...colors][0] : null
                return (
                  <Marker
                    key={group.key}
                    position={[group.lat, group.lng]}
                    icon={makeDotIcon(theme, fill, group.events.length)}
                    // Not a Leaflet option — react-leaflet forwards unknown
                    // props into marker.options, which is how the cluster
                    // above works out whether its contents share a category.
                    catColor={fill}
                    eventHandlers={{
                      click: () => {
                        if (group.events.length === 1) {
                          setSelectedGroup(null)
                          setSelected(group.events[0])
                        } else {
                          setSelected(null)
                          setSelectedGroup(group)
                        }
                      },
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -14]}>{group.venue}</Tooltip>
                  </Marker>
                )
              })}
            </MarkerClusterGroup>
          )}

          {/* Venues mode — pins open a summary sheet, not the page directly */}
          {mapMode === 'venues' && (
            <MarkerClusterGroup key={`venues-${theme}`} {...CLUSTER_PROPS}>
              {venues.map(venue => (
                <Marker
                  key={venue.id}
                  position={[venue.lat, venue.lng]}
                  icon={makeDotIcon(theme, getVenueTypeColor(venue.type), 1)}
                  catColor={getVenueTypeColor(venue.type)}
                  eventHandlers={{ click: () => setSelectedVenue(venue) }}
                >
                  <Tooltip direction="top" offset={[0, -14]}>{venue.name}</Tooltip>
                </Marker>
              ))}
            </MarkerClusterGroup>
          )}
        </MapContainer>

        {mapMode === 'events' && !eventsLoading && !eventsError && filtered.length === 0 && (
          <div className="map-empty">
            No events on this day
          </div>
        )}

        {mapMode === 'events' && (
          <MapEventSheet event={selected} onClose={() => setSelected(null)} />
        )}

        {mapMode === 'events' && (
          <MapVenueEventsSheet
            group={selectedGroup}
            onClose={() => setSelectedGroup(null)}
          />
        )}

        {mapMode === 'venues' && (
          <MapVenueSheet
            venue={selectedVenue}
            eventCount={selectedVenue
              ? events.filter(e => e.venueId === selectedVenue.id).length
              : 0}
            onClose={() => setSelectedVenue(null)}
          />
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

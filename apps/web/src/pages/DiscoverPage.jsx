import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
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
import { getVenueTypeColor, resolveVenueType, VENUE_TYPES, VENUE_TYPE_COLORS } from '../data/venueTypes.js'
import { getResolvedTheme, subscribeTheme } from '../data/themeStore.js'
import { useView, useSwitchView } from '../data/appMode.js'
import { getMapView, setMapView, hasCentredOnUser, markCentredOnUser } from '../data/mapView.js'
import Header from '../components/Header.jsx'
import ViewToggle from '../components/ViewToggle.jsx'
import CategoryFilter from '../components/CategoryFilter.jsx'
import VenueTypeFilter from '../components/VenueTypeFilter.jsx'
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

// "You are here" — a small solid dot with two rings pulsing out of it. Black
// on the light map, white on the dark one, so it reads against the tiles
// without borrowing a category colour or the accent, both of which would make
// it look like something you could tap.
function makeUserPinIcon(theme) {
  const c = PIN_COLORS[theme].venue
  return divIcon({
    className: '',
    html: `<div class="user-dot" style="--user:${c}">
             <span class="user-ring"></span>
             <span class="user-ring user-ring-delayed"></span>
           </div>`,
    iconSize: [28, 28],
    // Centred on the coordinate, unlike a teardrop which points at it.
    iconAnchor: [14, 14],
  })
}

// Slice order for the pies below. They are read against the key beside the
// map, so slices run in the order the key lists them rather than by size —
// the same category then sits in the same place on every dot.
//
// One list per map mode: the two palettes reuse several of the same colours,
// so a single shared ranking would order venue types by the event categories
// that happen to share their colour.
const CATEGORY_ORDER = Object.values(CATEGORIES).map(c => c.color)
const VENUE_TYPE_ORDER = VENUE_TYPES.map(t => VENUE_TYPE_COLORS[t])

// Used by both map modes: in events mode one dot per venue with events on the
// selected day, in venues mode one dot per venue coloured by its type.
//
// Events at a venue share the venue's coordinates, so drawing a dot per event
// stacked them perfectly — only the topmost was clickable, and zooming never
// separated them. Hence one dot per venue, with a count.
//
// `counts` is a list of [categoryColour, howMany] pairs. One entry fills the
// dot with that colour; several make it a pie, so a venue with two live music
// nights and one quiz reads as two thirds green.
function makeDotIcon(theme, counts, count, order) {
  const ring = PIN_COLORS[theme].venue
  const inner = count > 1 ? `<span class="map-dot-count">${count}</span>` : ''
  return divIcon({
    className: '',
    html: `<div class="map-dot" style="--dot-fill:${pieFill(counts, order)};--dot-ring:${ring}">${inner}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

// Tally a list of colours into [colour, count] pairs.
function countColors(colors) {
  const counts = new Map()
  for (const c of colors) counts.set(c, (counts.get(c) ?? 0) + 1)
  return [...counts]
}

// A cluster's mix is the sum of its children's. `catCounts` is set on each
// Marker below and lands in marker.options.
function clusterCounts(cluster) {
  const counts = new Map()
  for (const marker of cluster.getAllChildMarkers())
    for (const [color, n] of marker.options.catCounts ?? [])
      counts.set(color, (counts.get(color) ?? 0) + n)
  return [...counts]
}

// One category is a plain fill. More than one becomes a pie with a slice per
// category, sized by how many events it contributes — a blank circle said only
// "mixed", which is the one thing you already knew from the count.
//
// `order` is the list of colours in key order; anything not in it (a retired
// or legacy colour) sorts to the end rather than disappearing.
function pieFill(counts, order) {
  if (!counts.length) return 'transparent'
  if (counts.length === 1) return counts[0][0]
  const rank = color => {
    const i = order.indexOf(color)
    return i === -1 ? order.length : i
  }
  const sorted = [...counts].sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]))
  const total = sorted.reduce((n, [, c]) => n + c, 0)
  let acc = 0
  const stops = sorted.map(([color, n]) => {
    const from = (acc / total) * 100
    acc += n
    return `${color} ${from.toFixed(2)}% ${(acc / total * 100).toFixed(2)}%`
  })
  return `conic-gradient(${stops.join(',')})`
}

const totalOf = counts => counts.reduce((n, [, c]) => n + c, 0)

// The cluster's number counts events, not pins, so it agrees with the pie
// drawn from the same tally — a cluster of three venues holding five events
// between them says 5, the same as a single venue with five would.
function clusterIconFn(order) {
  return cluster => {
    const counts = clusterCounts(cluster)
    return makeClusterIcon(totalOf(counts) || cluster.getChildCount(), counts, order)
  }
}

function makeClusterIcon(count, counts, order) {
  // Bigger clusters read as heavier without becoming finger-sized.
  const size = count < 10 ? 34 : count < 50 ? 40 : 46
  return divIcon({
    className: '',
    html: `<div class="map-cluster" style="--cluster-fill:${pieFill(counts, order)};width:${size}px;height:${size}px">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// Shared across both map modes; only the slice order differs.
const CLUSTER_PROPS = {
  showCoverageOnHover: false,
  // Venues on the same parade (Northcote Road, Balham High Road) should merge
  // when zoomed out but separate readily as you move in.
  maxClusterRadius: 45,
  // Grouping by venue already removes identical coordinates, so this only
  // matters for the rare pair of venues at the same point.
  spiderfyOnMaxZoom: true,
  disableClusteringAtZoom: 17,
}

// Types a set of venues uses, in the order the list declares them so the chips,
// the key and the pie slices always agree. Retired types resolve first,
// otherwise an unmigrated row would show up as a type the app no longer offers.
function typesIn(venues) {
  const present = new Set(venues.map(v => resolveVenueType(v.type)))
  return VENUE_TYPES.filter(t => present.has(t))
}

// Re-renders when the effective light/dark theme changes (toggle or OS setting)
function useResolvedTheme() {
  const [theme, setTheme] = useState(() => getResolvedTheme())
  useEffect(() => subscribeTheme(() => setTheme(getResolvedTheme())), [])
  return theme
}

// Centre on the user once, when the first fix of the session arrives. A later
// fix leaves the view alone — by then the user is reading the map, and moving
// it under them is the bug they reported.
function CentreOnFirstFix({ coords }) {
  const map = useMap()
  useEffect(() => {
    if (!coords || hasCentredOnUser()) return
    markCentredOnUser()
    map.setView([coords.lat, coords.lng], map.getZoom())
    setMapView({ center: map.getCenter(), zoom: map.getZoom() })
  }, [coords, map])
  return null
}

// So the map reopens where it was left rather than snapping back.
function RememberView() {
  const map = useMapEvents({
    moveend: () => setMapView({ center: map.getCenter(), zoom: map.getZoom() }),
  })
  return null
}

export default function DiscoverPage() {
  const [category, setCategory] = useState('all')
  const [venueType, setVenueType] = useState('all')
  const [day, setDay] = useState(() => todayKey())
  const [selected, setSelected] = useState(null)
  const [selectedGroup, setSelectedGroup] = useState(null)  // venue with >1 event
  const [selectedVenue, setSelectedVenue] = useState(null)
  const [venues, setVenues] = useState([])
  const [venuesError, setVenuesError] = useState(false)
  const mapMode = useView()
  const switchView = useSwitchView()
  const events = useEvents()
  const eventsError = useEventsError()
  const eventsLoading = useEventsLoading()
  const reloadEvents = useReloadEvents()
  const { coords, status: locationStatus, request: requestLocation } = useUserLocation()
  const mapRef = useRef(null)
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

  // The chips offer everything on the map; the key describes what is left
  // after filtering, so it never names a colour with nothing to point at.
  const venueTypesPresent = useMemo(() => typesIn(venues), [venues])

  const filteredVenues = useMemo(
    () => venueType === 'all'
      ? venues
      : venues.filter(v => resolveVenueType(v.type) === venueType),
    [venues, venueType]
  )

  const venueTypesShown = useMemo(() => typesIn(filteredVenues), [filteredVenues])

  // The map only centres on you once, at startup, so this is the way back.
  // It takes a fresh fix first — recentring on a position from when the app
  // opened would put you somewhere you no longer are.
  async function recentre() {
    const fix = await requestLocation() ?? coords
    if (!fix || !mapRef.current) return
    mapRef.current.setView([fix.lat, fix.lng], mapRef.current.getZoom())
  }

  function handleCategoryChange(cat) {
    setCategory(cat)
    setSelected(null)
    setSelectedGroup(null)
  }

  // The view lives in the URL now, but the page stays mounted across the
  // change, so an open sheet has to be dismissed here rather than by unmounting.
  function switchMode(view) {
    setSelected(null)
    setSelectedGroup(null)
    setSelectedVenue(null)
    switchView(view)
  }

  return (
    <div className="discover-page">
      <Header>
        <span className="tonight-badge">Tonight</span>
      </Header>

      <ViewToggle mode={mapMode} onChange={switchMode} />

      {mapMode === 'events' && (
        <>
          <DayStrip
            active={day}
            onChange={d => { setDay(d); setSelected(null); setSelectedGroup(null) }}
          />
          <CategoryFilter active={category} onChange={handleCategoryChange} />
        </>
      )}

      {mapMode === 'venues' && (
        <VenueTypeFilter
          types={venueTypesPresent}
          active={venueType}
          onChange={t => { setVenueType(t); setSelectedVenue(null) }}
        />
      )}

      {mapMode === 'events' && eventsError && (
        <ErrorBanner message="Couldn't load events. Check your connection." onRetry={reloadEvents} />
      )}
      {mapMode === 'venues' && venuesError && (
        <ErrorBanner message="Couldn't load venues. Check your connection." onRetry={loadVenues} />
      )}

      <div className="map-wrapper">
        <MapContainer
          ref={mapRef}
          // Initial values only — react-leaflet does not track these after
          // mount, which is why the two helpers below drive the view instead.
          center={getMapView()?.center ?? center}
          zoom={getMapView()?.zoom ?? 14}
          zoomControl={false}
          attributionControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            key={theme}
            url={TILE_URLS[theme]}
            attribution=""
          />
          <CentreOnFirstFix coords={coords} />
          <RememberView />

          {/* User location pin */}
          <Marker position={center} icon={userPinIcon} />

          {/* Events mode — one pin per venue, clustered when they crowd.
              The cluster group is keyed so it rebuilds when the filters change;
              it does not reliably reconcile children in place. */}
          {mapMode === 'events' && (
            <MarkerClusterGroup
              key={`events-${day}-${category}-${theme}`}
              {...CLUSTER_PROPS}
              iconCreateFunction={clusterIconFn(CATEGORY_ORDER)}
            >
              {venueGroups.map(group => {
                // Compare resolved categories, not raw keys: retired keys are
                // remapped, so 'jazz' and 'music' are one category, as are
                // 'karaoke' and 'comedy'.
                const counts = countColors(group.events.map(e => getCategory(e.category).color))
                return (
                  <Marker
                    key={group.key}
                    position={[group.lat, group.lng]}
                    icon={makeDotIcon(theme, counts, group.events.length, CATEGORY_ORDER)}
                    // Not a Leaflet option — react-leaflet forwards unknown
                    // props into marker.options, which is how the cluster
                    // above adds up the mix of everything inside it.
                    catCounts={counts}
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
            <MarkerClusterGroup
              key={`venues-${venueType}-${theme}`}
              {...CLUSTER_PROPS}
              iconCreateFunction={clusterIconFn(VENUE_TYPE_ORDER)}
            >
              {filteredVenues.map(venue => (
                <Marker
                  key={venue.id}
                  position={[venue.lat, venue.lng]}
                  icon={makeDotIcon(theme, [[getVenueTypeColor(venue.type), 1]], 1, VENUE_TYPE_ORDER)}
                  catCounts={[[getVenueTypeColor(venue.type), 1]]}
                  eventHandlers={{ click: () => setSelectedVenue(venue) }}
                >
                  <Tooltip direction="top" offset={[0, -14]}>{venue.name}</Tooltip>
                </Marker>
              ))}
            </MarkerClusterGroup>
          )}
        </MapContainer>

        <button
          className={`map-recentre ${locationStatus === 'locating' ? 'is-locating' : ''}`}
          onClick={recentre}
          disabled={locationStatus === 'locating'}
          aria-label="Centre the map on my location"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="7" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
            <line x1="12" y1="1.5" x2="12" y2="4.5" />
            <line x1="12" y1="19.5" x2="12" y2="22.5" />
            <line x1="1.5" y1="12" x2="4.5" y2="12" />
            <line x1="19.5" y1="12" x2="22.5" y2="12" />
          </svg>
        </button>

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

        {mapMode === 'venues' && venueTypesShown.length > 0 && (
          <div className="map-legend">
            {venueTypesShown.map(type => (
              <span key={type} className="legend-item">
                <span className="legend-dot" style={{ background: VENUE_TYPE_COLORS[type] }} />
                {type}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import { divIcon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { geocodeCandidates } from '../data/eventsStore.js'
import { getResolvedTheme, subscribeTheme } from '../data/themeStore.js'
import './AddressPicker.css'

const TILE_URLS = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
}

const PIN = divIcon({
  className: '',
  html: '<div class="ap-pin"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

// Close enough to see which building it is.
const PIN_ZOOM = 17

// Only moves the map when a different match is chosen. Following the pin
// instead would re-centre on every drag, which reads as the pin springing
// back to the middle rather than staying where it was put.
function Recentre({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.setView([target.lat, target.lng], PIN_ZOOM)
  }, [target, map])
  return null
}

function useResolvedTheme() {
  const [theme, setTheme] = useState(() => getResolvedTheme())
  useEffect(() => subscribeTheme(() => setTheme(getResolvedTheme())), [])
  return theme
}

/**
 * Address entry for a venue: type it, choose from what the geocoder actually
 * found, then drag the pin to the door.
 *
 * The pin is the point of the whole exercise — it is what puts the venue on
 * the discover map — and until now it was never shown before being saved. A
 * geocoder lands on a street or postcode centroid often enough that on a road
 * like Northcote Road the difference is several venues wide, and only the
 * person who works there knows which door is theirs.
 *
 * `value` is { lat, lng, display } or null. Null means nothing is confirmed
 * yet, which is what the forms gate their submit button on.
 */
export default function AddressPicker({ address, onAddressChange, value, onChange }) {
  const [candidates, setCandidates] = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(null)
  const [moved, setMoved] = useState(false)
  // Mounted with a value when an existing venue is being edited.
  const [centre, setCentre] = useState(() => value && { lat: value.lat, lng: value.lng })
  const theme = useResolvedTheme()

  function handleAddressChange(e) {
    onAddressChange(e.target.value)
    // Editing the text invalidates whatever was confirmed against the old one.
    onChange(null)
    setCandidates([])
    setError(null)
    setMoved(false)
  }

  async function search() {
    if (!address.trim()) return
    setSearching(true)
    setError(null)
    setCandidates([])
    onChange(null)
    setMoved(false)
    try {
      const found = await geocodeCandidates(address)
      if (!found.length) {
        setError('No match found. Try adding the postcode, or a nearby landmark.')
      } else if (found.length === 1) {
        choose(found[0])
      } else {
        setCandidates(found)
      }
    } catch {
      setError('Could not reach the address service. Check your connection and try again.')
    }
    setSearching(false)
  }

  function choose(candidate) {
    onChange(candidate)
    setCentre({ lat: candidate.lat, lng: candidate.lng })
    setCandidates([])
  }

  return (
    <div className="address-picker">
      <label>
        Address
        <div className="address-row">
          <input
            required
            value={address}
            onChange={handleAddressChange}
            placeholder="e.g. 77 Bedford Hill, Balham, SW12 9HD"
          />
          <button
            type="button"
            className="lookup-btn"
            onClick={search}
            disabled={searching || !address.trim()}
          >
            {searching ? '…' : 'Find'}
          </button>
        </div>
      </label>

      {error && <p className="ap-error">{error}</p>}

      {candidates.length > 0 && (
        <div className="ap-candidates">
          <p className="ap-hint">{candidates.length} matches — which one is you?</p>
          {candidates.map(c => (
            <button
              type="button"
              key={`${c.lat},${c.lng}`}
              className="ap-candidate"
              onClick={() => choose(c)}
            >
              {c.display}
            </button>
          ))}
        </div>
      )}

      {value && (
        <div className="ap-confirm">
          <p className="ap-found">📍 {value.display}</p>
          <div className="ap-map">
            <MapContainer
              center={[value.lat, value.lng]}
              zoom={PIN_ZOOM}
              zoomControl={false}
              attributionControl={false}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer key={theme} url={TILE_URLS[theme]} attribution="" />
              <Recentre target={centre} />
              <Marker
                position={[value.lat, value.lng]}
                icon={PIN}
                draggable
                eventHandlers={{
                  dragend: e => {
                    const { lat, lng } = e.target.getLatLng()
                    onChange({ ...value, lat, lng })
                    setMoved(true)
                  },
                }}
              />
            </MapContainer>
          </div>
          <p className="ap-hint">
            {moved
              ? '✓ Pin moved. This is where customers will see you.'
              : 'Drag the pin if it is not on your door.'}
          </p>
        </div>
      )}
    </div>
  )
}

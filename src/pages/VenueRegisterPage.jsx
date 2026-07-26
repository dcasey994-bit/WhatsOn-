import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerVenue, geocodeAddress } from '../data/eventsStore.js'
import Header from '../components/Header.jsx'
import './VenuePage.css'

const BLANK_VENUE = {
  name: '', address: '',
  phone: '', website: '', capacity: '', type: 'Pub & Live Music Venue',
}

// Ensures a bare "example.com" is stored as a valid absolute URL
function normalizeWebsite(url) {
  const trimmed = url.trim()
  if (!trimmed) return null
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

const VENUE_TYPES = [
  'Pub & Live Music Venue', 'Live Music Venue', 'Bar', 'Club',
  'Theatre', 'Comedy Club', 'Restaurant', 'Other',
]

export default function VenueRegisterPage() {
  const navigate = useNavigate()
  const [venueForm, setVenueForm] = useState(BLANK_VENUE)
  const [geocoded, setGeocoded] = useState(null)
  const [geocoding, setGeocoding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function setV(field) {
    return e => setVenueForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleLookupAddress() {
    if (!venueForm.address.trim()) return
    setGeocoding(true)
    setError(null)
    setGeocoded(null)
    try {
      const result = await geocodeAddress(venueForm.address)
      setGeocoded(result)
    } catch {
      setError('Address not found. Try a more specific address including postcode.')
    }
    setGeocoding(false)
  }

  async function handleRegisterVenue(e) {
    e.preventDefault()
    if (!geocoded) { setError('Please verify your address first.'); return }
    setSaving(true)
    setError(null)
    try {
      const v = await registerVenue({
        name: venueForm.name,
        address: venueForm.address,
        lat: geocoded.lat,
        lng: geocoded.lng,
        phone: venueForm.phone || null,
        website: normalizeWebsite(venueForm.website),
        capacity: venueForm.capacity ? Number(venueForm.capacity) : null,
        type: venueForm.type,
      })
      navigate(`/venue/manage/${v.id}`, { replace: true })
    } catch {
      setError('Could not register venue. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="venue-page">
      <Header title="Add a venue" />
      <div className="add-event-form">
        <button className="vp-back-link" onClick={() => navigate('/venue')}>← My Venues</button>
        <p className="venue-intro">
          Create a venue profile to start listing events on WhatsOn?
        </p>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={handleRegisterVenue}>
          <label>
            Venue name
            <input required value={venueForm.name} onChange={setV('name')} placeholder="e.g. The Bedford" />
          </label>
          <label>
            Address
            <div className="address-row">
              <input
                required
                value={venueForm.address}
                onChange={e => { setV('address')(e); setGeocoded(null) }}
                placeholder="e.g. 77 Bedford Hill, Balham, SW12 9HD"
              />
              <button type="button" className="lookup-btn" onClick={handleLookupAddress} disabled={geocoding || !venueForm.address.trim()}>
                {geocoding ? '…' : 'Verify'}
              </button>
            </div>
          </label>
          {geocoded && (
            <p className="geocode-confirm">📍 {geocoded.display}</p>
          )}
          <label>
            Venue type
            <select value={venueForm.type} onChange={setV('type')}>
              {VENUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <div className="form-row">
            <label>
              Phone (optional)
              <input value={venueForm.phone} onChange={setV('phone')} placeholder="020 ..." />
            </label>
            <label>
              Capacity (optional)
              <input type="number" min="1" value={venueForm.capacity} onChange={setV('capacity')} placeholder="e.g. 200" />
            </label>
          </div>
          <label>
            Website (optional)
            <input value={venueForm.website} onChange={setV('website')} placeholder="e.g. thebedford.co.uk" />
          </label>
          <button type="submit" className="post-btn" disabled={saving || !geocoded}>
            {saving ? 'Registering…' : 'Register venue'}
          </button>
        </form>
      </div>
    </div>
  )
}

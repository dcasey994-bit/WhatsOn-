import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { venuePath, VENUE_HOME } from '../data/appMode.js'
import { registerVenue, normalizeWebsite } from '../data/eventsStore.js'
import AddressPicker from '../components/AddressPicker.jsx'
import { VENUE_TYPES } from '../data/venueTypes.js'
import Header from '../components/Header.jsx'
import './VenuePage.css'

const BLANK_VENUE = {
  name: '', address: '',
  phone: '', website: '', capacity: '', type: 'Pub',
}

export default function VenueRegisterPage() {
  const navigate = useNavigate()
  const [venueForm, setVenueForm] = useState(BLANK_VENUE)
  const [geocoded, setGeocoded] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function setV(field) {
    return e => setVenueForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleRegisterVenue(e) {
    e.preventDefault()
    if (!geocoded) { setError('Find your address and confirm the pin first.'); return }
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
      navigate(venuePath(v.id), { replace: true })
    } catch {
      setError('Could not register venue. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="venue-page">
      <Header title="Add a venue" />
      <div className="add-event-form">
        <button className="vp-back-link" onClick={() => navigate(VENUE_HOME)}>← My Venues</button>
        <p className="venue-intro">
          Create a venue profile to start listing events on WhatsOn?
        </p>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={handleRegisterVenue}>
          <label>
            Venue name
            <input required value={venueForm.name} onChange={setV('name')} placeholder="e.g. The Bedford" />
          </label>
          <AddressPicker
            address={venueForm.address}
            onAddressChange={next => setVenueForm(f => ({ ...f, address: next }))}
            value={geocoded}
            onChange={setGeocoded}
          />
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

import { useState, useEffect } from 'react'
import { CATEGORIES } from '../data/events.js'
import {
  fetchMyVenue, registerVenue,
  fetchVenueEvents, createEvent, updateEvent, deleteEvent,
  geocodeAddress, uploadEventImage,
  getSubscriptionState, trialDaysLeft,
} from '../data/eventsStore.js'
import { getUser } from '../data/authStore.js'
import { useReloadEvents } from '../data/EventsContext.jsx'
import Header from '../components/Header.jsx'
import './VenuePage.css'

const BLANK_EVENT = {
  name: '', category: 'music', date: '', time: '',
  price: '', capacity: '', ticket_url: '', description: '', image_url: '',
}

const BLANK_VENUE = {
  name: '', address: '',
  phone: '', capacity: '', type: 'Pub & Live Music Venue',
}

const VENUE_TYPES = [
  'Pub & Live Music Venue', 'Live Music Venue', 'Bar', 'Club',
  'Theatre', 'Comedy Club', 'Restaurant', 'Other',
]

export default function VenuePage() {
  const [venue, setVenue] = useState(null)
  const [events, setEvents] = useState([])
  const [view, setView] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [form, setForm] = useState(BLANK_EVENT)
  const [editingId, setEditingId] = useState(null)
  const [venueForm, setVenueForm] = useState(BLANK_VENUE)
  const [geocoded, setGeocoded] = useState(null)  // { lat, lng, display }
  const [geocoding, setGeocoding] = useState(false)
  const [uploading, setUploading] = useState(false)
  const reloadEvents = useReloadEvents()

  useEffect(() => {
    fetchMyVenue().then(v => {
      setVenue(v)
      if (v) loadEvents(v.id)
      else setLoading(false)
    })
  }, [])

  async function loadEvents(venueId) {
    setLoading(true)
    const rows = await fetchVenueEvents(venueId)
    setEvents(rows)
    setLoading(false)
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
        capacity: venueForm.capacity ? Number(venueForm.capacity) : null,
        type: venueForm.type,
      })
      setVenue(v)
      setEvents([])
    } catch {
      setError('Could not register venue. Please try again.')
    }
    setSaving(false)
  }

  async function handleAddEvent(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const fields = {
      name: form.name,
      category: form.category,
      date: form.date,
      time: form.time,
      price: form.price === '' ? 0 : Number(form.price),
      capacity: form.capacity ? Number(form.capacity) : null,
      ticket_url: form.ticket_url || null,
      description: form.description,
      image_url: form.image_url || null,
    }
    try {
      if (editingId) {
        const row = await updateEvent(editingId, fields)
        setEvents(prev => prev.map(ev => (ev.id === editingId ? row : ev)))
        setSuccess('Event updated!')
      } else {
        const row = await createEvent(venue.id, fields)
        setEvents(prev => [...prev, row])
        setSuccess('Event posted!')
      }
      setForm(BLANK_EVENT)
      setEditingId(null)
      reloadEvents()  // refresh customer-facing map immediately
      setTimeout(() => { setSuccess(null); setView('dashboard') }, 1500)
    } catch {
      setError(editingId ? 'Could not update event.' : 'Could not post event. Please try again.')
    }
    setSaving(false)
  }

  function startAddEvent() {
    setForm(BLANK_EVENT)
    setEditingId(null)
    setError(null)
    setView('add')
  }

  function handleEdit(ev) {
    setForm({
      name: ev.name,
      category: ev.category,
      date: ev.date,
      time: ev.time?.slice(0, 5) || '',
      price: ev.price ?? '',
      capacity: ev.capacity ?? '',
      ticket_url: ev.ticket_url ?? '',
      description: ev.description ?? '',
      image_url: ev.image_url ?? '',
    })
    setEditingId(ev.id)
    setError(null)
    setView('add')
  }

  async function handleDelete(eventId) {
    if (!confirm('Delete this event?')) return
    await deleteEvent(eventId)
    setEvents(prev => prev.filter(e => e.id !== eventId))
    reloadEvents()
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const url = await uploadEventImage(file)
      setForm(f => ({ ...f, image_url: url }))
    } catch {
      setError('Could not upload image. Please try a smaller JPG or PNG.')
    }
    setUploading(false)
  }

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }
  function setV(field) {
    return e => setVenueForm(f => ({ ...f, [field]: e.target.value }))
  }

  // ── Register venue screen ───────────────────────────────────────────────
  if (!loading && !venue) {
    return (
      <div className="venue-page">
        <Header title="Register your venue" />
        <div className="add-event-form">
          <p className="venue-intro">
            Create your venue profile to start listing events on WhatsOn?
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
              <p className="geocode-confirm">
                📍 {geocoded.display}
              </p>
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
            <button type="submit" className="post-btn" disabled={saving || !geocoded}>
              {saving ? 'Registering…' : 'Register venue'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Subscription state ──────────────────────────────────────────────────
  const subState = getSubscriptionState(venue)
  const daysLeft = trialDaysLeft(venue)
  const isLapsed = subState === 'lapsed'

  function handleSubscribe() {
    const link = import.meta.env.VITE_STRIPE_PAYMENT_LINK
    if (!link) return
    const user = getUser()
    const url = `${link}?client_reference_id=${venue.id}${user?.email ? `&prefilled_email=${encodeURIComponent(user.email)}` : ''}`
    window.location.href = url
  }

  // ── Lapsed paywall ──────────────────────────────────────────────────────
  if (!loading && venue && isLapsed) {
    return (
      <div className="venue-page">
        <Header title={venue.name} />
        <div className="sub-paywall">
          <div className="sub-paywall-icon">🔒</div>
          <h2>Your free trial has ended</h2>
          <p>Subscribe to keep your events visible on WhatsOn? and continue managing your listings.</p>
          <div className="sub-price">
            <span className="sub-amount">£20</span>
            <span className="sub-period">/month</span>
          </div>
          <ul className="sub-features">
            <li>Unlimited event listings</li>
            <li>Live map placement</li>
            <li>Going + save counts</li>
            <li>Cancel anytime</li>
          </ul>
          <button className="sub-cta-btn" onClick={handleSubscribe}>
            Subscribe now
          </button>
          <p className="sub-small">Secure payment via Stripe</p>
        </div>
      </div>
    )
  }

  // ── Main dashboard ──────────────────────────────────────────────────────
  return (
    <div className="venue-page">
      <Header title={venue?.name || ''}>
        <span className="verified-badge">✓ Verified</span>
      </Header>

      {subState === 'trialing' && daysLeft <= 14 && (
        <div className={`trial-banner ${daysLeft <= 3 ? 'trial-banner--urgent' : ''}`}>
          {daysLeft === 0
            ? 'Your free trial expires today — subscribe to keep your events live.'
            : `Free trial: ${daysLeft} day${daysLeft === 1 ? '' : 's'} left.`}
          {' '}
          <button className="trial-subscribe-btn" onClick={handleSubscribe}>
            Subscribe — £20/mo
          </button>
        </div>
      )}

      <div className="venue-tabs">
        <button className={`vtab ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
          My Events
        </button>
        <button className={`vtab ${view === 'add' ? 'active' : ''}`} onClick={startAddEvent}>
          + Add Event
        </button>
      </div>

      {view === 'dashboard' && (
        <div className="venue-dashboard">
          <div className="stats-row">
            <div className="stat-box stat-box-wide">
              <span className="stat-num">{events.length}</span>
              <span className="stat-label">Upcoming Events</span>
            </div>
            <div className="stat-box stat-box-wide">
              <span className="stat-num">{venue?.capacity?.toLocaleString() ?? '—'}</span>
              <span className="stat-label">Venue Capacity</span>
            </div>
          </div>

          <h3 className="section-heading">Upcoming Listings</h3>

          {loading ? (
            <p className="loading-text">Loading…</p>
          ) : events.length === 0 ? (
            <div className="no-events">
              <p>No upcoming events listed.</p>
              <button className="add-first-btn" onClick={startAddEvent}>
                + Add your first event
              </button>
            </div>
          ) : (
            <div className="event-rows">
              {events.map(event => {
                const cat = CATEGORIES[event.category] || CATEGORIES.music
                const dateLabel = new Date(event.date + 'T00:00:00').toLocaleDateString('en-GB', {
                  weekday: 'short', day: 'numeric', month: 'short',
                })
                return (
                  <div key={event.id} className="venue-event-row">
                    <span className="vc-dot" style={{ background: cat.color }} />
                    <div className="vc-info">
                      <p className="vc-name">{event.name}</p>
                      <p className="vc-meta">
                        <span className="vc-cat" style={{ color: cat.color }}>{cat.label}</span>
                        &nbsp;·&nbsp;{dateLabel}
                        &nbsp;·&nbsp;{event.time?.slice(0, 5)}
                        &nbsp;·&nbsp;{Number(event.price) === 0 ? 'Free' : `£${event.price}`}
                      </p>
                    </div>
                    <button className="edit-event-btn" onClick={() => handleEdit(event)} aria-label="Edit event">
                      ✎
                    </button>
                    <button className="delete-event-btn" onClick={() => handleDelete(event.id)} aria-label="Delete event">
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {view === 'add' && (
        <div className="add-event-form">
          {success && <div className="success-banner">🎉 {success}</div>}
          {error && <p className="form-error">{error}</p>}
          <h3 className="section-heading">{editingId ? 'Edit Event' : 'New Event'}</h3>
          <form onSubmit={handleAddEvent}>
            <label>
              Event name
              <input required value={form.name} onChange={set('name')} placeholder="e.g. Open Mic Night" />
            </label>
            <label>
              Category
              <select value={form.category} onChange={set('category')}>
                {Object.entries(CATEGORIES).map(([key, cat]) => (
                  <option key={key} value={key}>{cat.label}</option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                Date
                <input type="date" required value={form.date} onChange={set('date')} />
              </label>
              <label>
                Time
                <input type="time" required value={form.time} onChange={set('time')} />
              </label>
            </div>
            <div className="form-row">
              <label>
                Ticket price (£)
                <input type="number" min="0" value={form.price} onChange={set('price')} placeholder="0 = Free" />
              </label>
              <label>
                Capacity
                <input type="number" min="1" value={form.capacity} onChange={set('capacity')} placeholder="Optional" />
              </label>
            </div>
            <label>
              Ticket link (optional)
              <input type="url" value={form.ticket_url} onChange={set('ticket_url')} placeholder="https://..." />
            </label>
            <label>
              Event image (optional)
              {form.image_url && (
                <div className="image-preview" style={{ backgroundImage: `url(${form.image_url})` }}>
                  <button type="button" className="image-remove" onClick={() => setForm(f => ({ ...f, image_url: '' }))}>
                    Remove
                  </button>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
              {uploading && <span className="upload-hint">Uploading…</span>}
            </label>
            <label>
              Description
              <textarea required value={form.description} onChange={set('description')} rows={4} placeholder="Tell people what to expect..." />
            </label>
            <button type="submit" className="post-btn" disabled={saving || uploading}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Post Event'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

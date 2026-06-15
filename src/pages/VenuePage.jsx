import { useState, useEffect } from 'react'
import { CATEGORIES } from '../data/events.js'
import {
  fetchMyVenue, registerVenue,
  fetchVenueEvents, createEvent, deleteEvent,
  AREA_COORDS,
} from '../data/eventsStore.js'
import Header from '../components/Header.jsx'
import './VenuePage.css'

const BLANK_EVENT = {
  name: '', category: 'music', date: '', time: '',
  price: '', capacity: '', ticket_url: '', description: '',
}

const BLANK_VENUE = {
  name: '', address: '', area: 'Balham',
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
  const [venueForm, setVenueForm] = useState(BLANK_VENUE)

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

  async function handleRegisterVenue(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const coords = AREA_COORDS[venueForm.area]
      const v = await registerVenue({
        name: venueForm.name,
        address: venueForm.address,
        lat: coords.lat,
        lng: coords.lng,
        phone: venueForm.phone || null,
        capacity: venueForm.capacity ? Number(venueForm.capacity) : null,
        type: venueForm.type,
      })
      setVenue(v)
      setEvents([])
    } catch (err) {
      setError('Could not register venue. Please try again.')
    }
    setSaving(false)
  }

  async function handleAddEvent(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const row = await createEvent(venue.id, {
        name: form.name,
        category: form.category,
        date: form.date,
        time: form.time,
        price: form.price === '' ? 0 : Number(form.price),
        capacity: form.capacity ? Number(form.capacity) : null,
        ticket_url: form.ticket_url || null,
        description: form.description,
      })
      setEvents(prev => [...prev, row])
      setForm(BLANK_EVENT)
      setSuccess('Event posted!')
      setTimeout(() => { setSuccess(null); setView('dashboard') }, 1500)
    } catch (err) {
      setError('Could not post event. Please try again.')
    }
    setSaving(false)
  }

  async function handleDelete(eventId) {
    if (!confirm('Delete this event?')) return
    await deleteEvent(eventId)
    setEvents(prev => prev.filter(e => e.id !== eventId))
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
              <input required value={venueForm.address} onChange={setV('address')} placeholder="e.g. 77 Bedford Hill, Balham, SW12 9HD" />
            </label>
            <label>
              Area
              <select value={venueForm.area} onChange={setV('area')}>
                {Object.keys(AREA_COORDS).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
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
            <button type="submit" className="post-btn" disabled={saving}>
              {saving ? 'Registering…' : 'Register venue'}
            </button>
          </form>
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

      <div className="venue-tabs">
        <button className={`vtab ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
          My Events
        </button>
        <button className={`vtab ${view === 'add' ? 'active' : ''}`} onClick={() => setView('add')}>
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
              <button className="add-first-btn" onClick={() => setView('add')}>
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
              Description
              <textarea required value={form.description} onChange={set('description')} rows={4} placeholder="Tell people what to expect..." />
            </label>
            <button type="submit" className="post-btn" disabled={saving}>
              {saving ? 'Posting…' : 'Post Event'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

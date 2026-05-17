import { useState } from 'react'
import { CATEGORIES, EVENTS, VENUES } from '../data/events.js'
import Header from '../components/Header.jsx'
import './VenuePage.css'

const BLANK = { name: '', category: 'music', date: '', time: '', price: '', description: '', capacity: '' }

export default function VenuePage() {
  const [view, setView] = useState('dashboard') // 'dashboard' | 'add'
  const [form, setForm] = useState(BLANK)
  const [posted, setPosted] = useState([])
  const [success, setSuccess] = useState(false)

  // Mock: pretend we're logged in as Whelan's (venue 1)
  const myVenue = VENUES[0]
  const myEvents = [...EVENTS.filter(e => e.venueId === 1), ...posted]

  function handleSubmit(e) {
    e.preventDefault()
    const newEvent = {
      ...form,
      id: Date.now(),
      venue: myVenue.name,
      venueId: 1,
      address: myVenue.address,
      lat: 53.3344,
      lng: -6.2635,
      date: 'Tonight',
      distance: '0.4 km',
      price: form.price === '' || form.price === '0' ? 0 : Number(form.price),
      likes: 0,
      views: 0,
      saves: 0,
      ticketsLeft: form.capacity ? Number(form.capacity) : null,
      lineup: [],
      artist_bio: form.description,
      image: null,
    }
    setPosted(p => [newEvent, ...p])
    setForm(BLANK)
    setSuccess(true)
    setTimeout(() => { setSuccess(false); setView('dashboard') }, 1800)
  }

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  return (
    <div className="venue-page">
      <Header title={myVenue.name}>
        <span className="verified-badge">✓ Verified</span>
      </Header>

      <div className="venue-tabs">
        <button className={`vtab ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>My Events</button>
        <button className={`vtab ${view === 'add' ? 'active' : ''}`} onClick={() => setView('add')}>+ Add Event</button>
      </div>

      {view === 'dashboard' && (
        <div className="venue-dashboard">
          <div className="stats-row">
            <div className="stat-box">
              <span className="stat-num">{myEvents.reduce((s, e) => s + e.views, 0)}</span>
              <span className="stat-label">Total Views</span>
            </div>
            <div className="stat-box">
              <span className="stat-num">{myEvents.reduce((s, e) => s + e.saves, 0)}</span>
              <span className="stat-label">Saves</span>
            </div>
            <div className="stat-box">
              <span className="stat-num">{myEvents.length}</span>
              <span className="stat-label">Events</span>
            </div>
          </div>

          <h3 className="section-heading">Tonight's Listings</h3>
          {myEvents.length === 0 && (
            <p className="no-events">No events posted yet. Add your first event!</p>
          )}
          {myEvents.map(event => {
            const cat = CATEGORIES[event.category]
            return (
              <div key={event.id} className="venue-event-row">
                <span className="vc-badge" style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
                <div className="vc-info">
                  <p className="vc-name">{event.name}</p>
                  <p className="vc-meta">{event.time} · {event.price === 0 ? 'Free' : `€${event.price}`}</p>
                </div>
                <div className="vc-stats">
                  <span>👁 {event.views}</span>
                  <span>♥ {event.likes}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view === 'add' && (
        <div className="add-event-form">
          {success && <div className="success-banner">Event posted! 🎉</div>}
          <form onSubmit={handleSubmit}>
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
                <input type="date" value={form.date} onChange={set('date')} />
              </label>
              <label>
                Time
                <input type="time" required value={form.time} onChange={set('time')} />
              </label>
            </div>

            <div className="form-row">
              <label>
                Ticket price (€)
                <input type="number" min="0" value={form.price} onChange={set('price')} placeholder="0 = Free" />
              </label>
              <label>
                Capacity
                <input type="number" min="1" value={form.capacity} onChange={set('capacity')} placeholder="Optional" />
              </label>
            </div>

            <label>
              Description
              <textarea required value={form.description} onChange={set('description')} rows={4} placeholder="Tell people what to expect..." />
            </label>

            <button type="submit" className="post-btn">Post Event</button>
          </form>
        </div>
      )}
    </div>
  )
}

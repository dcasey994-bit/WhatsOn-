import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CATEGORIES, getCategory } from '../data/events.js'
import {
  fetchVenueById, fetchVenueEvents, fetchPastVenueEvents,
  createEvent, updateEvent, deleteEvent, uploadEventImage,
  getSubscriptionState, trialDaysLeft, startCheckout,
  fetchVenueMembers, addVenueMember, removeVenueMember, updateMemberRole,
  updateVenue, geocodeAddress, normalizeWebsite,
} from '../data/eventsStore.js'
import { VENUE_TYPES, venueTypeOptions } from '../data/venueTypes.js'
import { getUser } from '../data/authStore.js'
import { useReloadEvents } from '../data/EventsContext.jsx'
import Header from '../components/Header.jsx'
import './VenuePage.css'
import './VenueManagePage.css'

const BLANK_EVENT = {
  name: '', category: 'music', date: '', time: '',
  price: '', capacity: '', ticket_url: '', description: '', image_url: '',
  special_offer: '',
}

export default function VenueManagePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [venue, setVenue] = useState(null)
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [pastEvents, setPastEvents] = useState([])
  const [eventTab, setEventTab] = useState('upcoming')
  const [view, setView] = useState('main')  // 'main' | 'add' | 'edit-venue'
  const [loading, setLoading] = useState(true)
  const [notMine, setNotMine] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [form, setForm] = useState(BLANK_EVENT)
  const [editingId, setEditingId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [members, setMembers] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('events_manager')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState(null)
  const [venueForm, setVenueForm] = useState(null)
  const [geocoded, setGeocoded] = useState(null)
  const [geocoding, setGeocoding] = useState(false)
  const [savingVenue, setSavingVenue] = useState(false)
  const [venueError, setVenueError] = useState(null)
  const reloadEvents = useReloadEvents()

  async function loadEvents(venueId) {
    const [upcoming, past] = await Promise.all([
      fetchVenueEvents(venueId),
      fetchPastVenueEvents(venueId),
    ])
    setUpcomingEvents(upcoming)
    setPastEvents(past)
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchVenueById(id).then(async v => {
      if (!active) return
      if (!v || !v.memberRole) {
        setNotMine(true)
        setLoading(false)
        return
      }
      setVenue(v)
      const loads = [loadEvents(v.id)]
      if (v.memberRole === 'admin') {
        loads.push(fetchVenueMembers(v.id).then(setMembers).catch(() => {}))
      }
      await Promise.all(loads)
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [id])

  const events = eventTab === 'upcoming' ? upcomingEvents : pastEvents

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
      special_offer: form.special_offer?.trim() || null,
    }
    try {
      if (editingId) {
        const row = await updateEvent(editingId, fields)
        setUpcomingEvents(prev => prev.map(ev => (ev.id === editingId ? row : ev)))
        setSuccess('Event updated!')
      } else {
        const row = await createEvent(venue.id, fields)
        setUpcomingEvents(prev => [...prev, row])
        setSuccess('Event posted!')
      }
      setForm(BLANK_EVENT)
      setEditingId(null)
      reloadEvents()
      setTimeout(() => { setSuccess(null); setView('main') }, 1500)
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
      special_offer: ev.special_offer ?? '',
    })
    setEditingId(ev.id)
    setError(null)
    setView('add')
  }

  async function handleDelete(eventId) {
    if (!confirm('Delete this event?')) return
    await deleteEvent(eventId)
    setUpcomingEvents(prev => prev.filter(e => e.id !== eventId))
    setPastEvents(prev => prev.filter(e => e.id !== eventId))
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

  function startEditVenue() {
    setVenueForm({
      name: venue.name,
      address: venue.address,
      phone: venue.phone ?? '',
      website: venue.website ?? '',
      capacity: venue.capacity ?? '',
      type: venue.type || VENUE_TYPES[0],
    })
    setGeocoded({ lat: venue.lat, lng: venue.lng, display: venue.address })
    setVenueError(null)
    setView('edit-venue')
  }

  function setVF(field) {
    return e => setVenueForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleLookupVenueAddress() {
    if (!venueForm.address.trim()) return
    setGeocoding(true)
    setVenueError(null)
    setGeocoded(null)
    try {
      const result = await geocodeAddress(venueForm.address)
      setGeocoded(result)
    } catch {
      setVenueError('Address not found. Try a more specific address including postcode.')
    }
    setGeocoding(false)
  }

  async function handleSaveVenue(e) {
    e.preventDefault()
    if (!geocoded) { setVenueError('Please verify your address first.'); return }
    setSavingVenue(true)
    setVenueError(null)
    try {
      const updated = await updateVenue(venue.id, {
        name: venueForm.name,
        address: venueForm.address,
        lat: geocoded.lat,
        lng: geocoded.lng,
        phone: venueForm.phone || null,
        website: normalizeWebsite(venueForm.website),
        capacity: venueForm.capacity ? Number(venueForm.capacity) : null,
        type: venueForm.type,
      })
      setVenue(v => ({ ...v, ...updated }))
      setView('main')
    } catch (err) {
      console.error('updateVenue failed:', err)
      if (err.code === 'PGRST116') {
        // Update matched 0 rows — RLS silently blocked it, not a real "not found"
        setVenueError("You don't have permission to edit this venue's details. Only an Admin can — Events Managers can edit events but not venue details.")
      } else {
        setVenueError(err.message ? `Could not save: ${err.message}` : 'Could not save venue details. Please try again.')
      }
    }
    setSavingVenue(false)
  }

  async function handleInvite(e) {
    e.preventDefault()
    setInviting(true)
    setInviteError(null)
    try {
      await addVenueMember(venue.id, inviteEmail, inviteRole)
      const updated = await fetchVenueMembers(venue.id)
      setMembers(updated)
      setInviteEmail('')
    } catch (err) {
      setInviteError(err.message)
    }
    setInviting(false)
  }

  async function handleRemoveMember(userId) {
    if (!confirm('Remove this person from the venue?')) return
    await removeVenueMember(venue.id, userId)
    setMembers(prev => prev.filter(m => m.user_id !== userId))
  }

  async function handleChangeMemberRole(userId, newRole) {
    await updateMemberRole(venue.id, userId, newRole)
    setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: newRole } : m))
  }

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  if (notMine) {
    return (
      <div className="venue-page">
        <Header title="My Venues" />
        <div className="vm-empty">
          <p>Venue not found.</p>
          <button className="vl-add-btn" onClick={() => navigate('/manage')}>← Back to My Venues</button>
        </div>
      </div>
    )
  }

  if (loading || !venue) {
    return (
      <div className="venue-page">
        <Header title="My Venues" />
        <p className="loading-text">Loading…</p>
      </div>
    )
  }

  const subState = getSubscriptionState(venue)
  const daysLeft = trialDaysLeft(venue)
  const isAdmin = venue?.memberRole === 'admin'
  const user = getUser()

  // ── Event add/edit form ──────────────────────────────────────────────────
  if (view === 'add') {
    return (
      <div className="venue-page">
        <Header title={venue.name} />
        <div className="add-event-form">
          <button className="vp-back-link" onClick={() => { setView('main'); setEditingId(null) }}>← Back</button>
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
            <label>
              Special offer (optional)
              <input value={form.special_offer} onChange={set('special_offer')} placeholder="e.g. 2-for-1 drinks before 9pm" />
            </label>
            <button type="submit" className="post-btn" disabled={saving || uploading}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Post Event'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Edit venue details ────────────────────────────────────────────────────
  if (view === 'edit-venue' && venueForm) {
    return (
      <div className="venue-page">
        <Header title={venue.name} />
        <div className="add-event-form">
          <button className="vp-back-link" onClick={() => setView('main')}>← Back</button>
          {venueError && <p className="form-error">{venueError}</p>}
          <h3 className="section-heading">Edit Venue</h3>
          <form onSubmit={handleSaveVenue}>
            <label>
              Venue name
              <input required value={venueForm.name} onChange={setVF('name')} placeholder="e.g. The Bedford" />
            </label>
            <label>
              Address
              <div className="address-row">
                <input
                  required
                  value={venueForm.address}
                  onChange={e => { setVF('address')(e); setGeocoded(null) }}
                  placeholder="e.g. 77 Bedford Hill, Balham, SW12 9HD"
                />
                <button type="button" className="lookup-btn" onClick={handleLookupVenueAddress} disabled={geocoding || !venueForm.address.trim()}>
                  {geocoding ? '…' : 'Verify'}
                </button>
              </div>
            </label>
            {geocoded && (
              <p className="geocode-confirm">📍 {geocoded.display}</p>
            )}
            <label>
              Venue type
              <select value={venueForm.type} onChange={setVF('type')}>
                {venueTypeOptions(venue.type).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <div className="form-row">
              <label>
                Phone (optional)
                <input value={venueForm.phone} onChange={setVF('phone')} placeholder="020 ..." />
              </label>
              <label>
                Capacity (optional)
                <input type="number" min="1" value={venueForm.capacity} onChange={setVF('capacity')} placeholder="e.g. 200" />
              </label>
            </div>
            <label>
              Website (optional)
              <input value={venueForm.website} onChange={setVF('website')} placeholder="e.g. thebedford.co.uk" />
            </label>
            <button type="submit" className="post-btn" disabled={savingVenue || !geocoded}>
              {savingVenue ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Main per-venue page ────────────────────────────────────────────────────
  return (
    <div className="venue-page">
      <Header title={venue.name}>
        <span className="verified-badge">✓ Verified</span>
      </Header>

      <button className="vp-back-link vp-back-pad" onClick={() => navigate('/manage')}>← My Venues</button>

      {/* Subscription card — admin only */}
      {isAdmin && (
        <div className={`vm-sub-card ${subState === 'archived' ? 'vm-sub-lapsed' : subState === 'active' ? 'vm-sub-active' : 'vm-sub-trial'}`}>
          <div className="vm-sub-row">
            <span className="vm-sub-label">
              {subState === 'active' && '✓ Active subscription'}
              {subState === 'trialing' && `Free trial — ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
              {subState === 'archived' && '⚠ Venue archived — events hidden'}
            </span>
            {subState !== 'active' && (
              <button className="vm-sub-btn" onClick={() => startCheckout(venue)}>
                {subState === 'archived' ? 'Reactivate' : 'Subscribe'} — £20/mo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Venue details */}
      <div className="vm-section">
        <div className="vm-section-head">
          <h2 className="vm-section-title">Venue Details</h2>
          {isAdmin && (
            <button className="vm-edit-btn" onClick={startEditVenue}>Edit</button>
          )}
        </div>
        <div className="vm-detail-row">
          <span className="vm-detail-label">Type</span>
          <span className="vm-detail-value">{venue.type || '—'}</span>
        </div>
        <div className="vm-detail-row">
          <span className="vm-detail-label">Address</span>
          <a className="vm-detail-value vm-detail-link"
            href={`https://maps.google.com/?q=${venue.lat},${venue.lng}`}
            target="_blank" rel="noopener noreferrer">
            {venue.address}
          </a>
        </div>
        {venue.phone && (
          <div className="vm-detail-row">
            <span className="vm-detail-label">Phone</span>
            <a className="vm-detail-value vm-detail-link" href={`tel:${venue.phone}`}>{venue.phone}</a>
          </div>
        )}
        {venue.website && (
          <div className="vm-detail-row">
            <span className="vm-detail-label">Website</span>
            <a className="vm-detail-value vm-detail-link" href={venue.website} target="_blank" rel="noopener noreferrer">
              {venue.website.replace(/^https?:\/\//i, '')}
            </a>
          </div>
        )}
        {venue.capacity && (
          <div className="vm-detail-row">
            <span className="vm-detail-label">Capacity</span>
            <span className="vm-detail-value">{venue.capacity.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Team — admin only */}
      {isAdmin && (
        <div className="vm-section">
          <h2 className="vm-section-title">Team</h2>
          {members.map(m => (
            <div key={m.user_id} className="vm-member-row">
              <span className="vm-member-email">{m.email}</span>
              <div className="vm-member-controls">
                {m.user_id === user?.id ? (
                  <span className={`vm-member-badge ${m.role === 'admin' ? 'is-admin' : 'is-manager'}`}>
                    {m.role === 'admin' ? 'Admin (you)' : 'Events Manager (you)'}
                  </span>
                ) : (
                  <>
                    <select
                      className="vm-role-select"
                      value={m.role}
                      onChange={e => handleChangeMemberRole(m.user_id, e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="events_manager">Events Manager</option>
                    </select>
                    <button className="vm-member-remove" onClick={() => handleRemoveMember(m.user_id)} aria-label="Remove">✕</button>
                  </>
                )}
              </div>
            </div>
          ))}
          <form className="vm-invite-form" onSubmit={handleInvite}>
            <input
              type="email"
              className="vm-invite-email"
              placeholder="their@email.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              required
            />
            <select className="vm-role-select" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
              <option value="events_manager">Events Manager</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" className="vm-invite-btn" disabled={inviting}>
              {inviting ? '…' : 'Add'}
            </button>
          </form>
          {inviteError && <p className="vm-invite-error">{inviteError}</p>}
        </div>
      )}

      {/* Events */}
      <div className="venue-tabs">
        <button className={`vtab ${eventTab === 'upcoming' ? 'active' : ''}`} onClick={() => setEventTab('upcoming')}>
          Upcoming
        </button>
        <button className={`vtab ${eventTab === 'past' ? 'active' : ''}`} onClick={() => setEventTab('past')}>
          Past Events
        </button>
      </div>

      <div className="venue-dashboard">
        {events.length === 0 ? (
          <div className="no-events">
            {eventTab === 'upcoming' ? (
              <>
                <p>No upcoming events listed.</p>
                <button className="add-first-btn" onClick={startAddEvent}>+ Add your first event</button>
              </>
            ) : (
              <p>No past events yet.</p>
            )}
          </div>
        ) : (
          <div className="event-rows">
            {events.map(event => {
              const cat = getCategory(event.category)
              const dateLabel = new Date(event.date + 'T00:00:00').toLocaleDateString('en-GB', {
                weekday: 'short', day: 'numeric', month: 'short',
              })
              return (
                <div key={event.id} className="venue-event-row">
                  <button
                    className="vc-open"
                    onClick={() => navigate(`/event/${event.id}`)}
                    aria-label={`Open ${event.name}`}
                  >
                    <span className="vc-dot" style={{ background: cat.color }} />
                    <span className="vc-info">
                      <span className="vc-name">{event.name}</span>
                      <span className="vc-meta">
                        <span className="vc-cat" style={{ color: cat.color }}>{cat.label}</span>
                        &nbsp;·&nbsp;{dateLabel}
                        &nbsp;·&nbsp;{event.time?.slice(0, 5)}
                        &nbsp;·&nbsp;{Number(event.price) === 0 ? 'Free' : `£${event.price}`}
                      </span>
                    </span>
                  </button>
                  {eventTab === 'upcoming' && (
                    <button className="edit-event-btn" onClick={() => handleEdit(event)} aria-label="Edit event">✎</button>
                  )}
                  <button className="delete-event-btn" onClick={() => handleDelete(event.id)} aria-label="Delete event">✕</button>
                </div>
              )
            })}
          </div>
        )}

        {eventTab === 'upcoming' && (
          <button className="add-event-fab" onClick={startAddEvent}>+ Add Event</button>
        )}
      </div>
    </div>
  )
}

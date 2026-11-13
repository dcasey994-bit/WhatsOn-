import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { VENUE_HOME } from '../data/appMode.js'
import { CATEGORIES, getCategory } from '../data/events.js'
import {
  fetchVenueById, fetchVenueEvents, fetchPastVenueEvents,
  createEvent, updateEvent, deleteEvent, uploadEventImage,
  getSubscriptionState, trialDaysLeft, startCheckout, openBillingPortal,
  fetchVenueMembers, addVenueMember, removeVenueMember, updateMemberRole,
  updateVenue, normalizeWebsite, normalizeInstagram,
  createEventSeries, updateEventSeriesFrom, deleteEventSeriesFrom, fetchVenueEventStats,
} from '../data/eventsStore.js'
import { REPEAT_OPTIONS, describeRepeat, repeatDates, defaultUntil, maxUntil } from '../data/recurrence.js'
import { VENUE_TYPES, venueTypeOptions, resolveVenueType } from '../data/venueTypes.js'
import { endsNextDay, formatTimeRange } from '../data/eventTime.js'
import { getUser } from '../data/authStore.js'
import { isNative } from '../lib/platform.js'
import { useReloadEvents } from '../data/EventsContext.jsx'
import Header from '../components/Header.jsx'
import AddressPicker from '../components/AddressPicker.jsx'
import VenueAttention from '../components/VenueAttention.jsx'
import VenueChecklist from '../components/VenueChecklist.jsx'
import './VenuePage.css'
import './VenueManagePage.css'

const BLANK_EVENT = {
  name: '', category: 'music', date: '', time: '', end_time: '',
  price: '', capacity: '', ticket_url: '', description: '', image_url: '',
  special_offer: '',
}

export default function VenueManagePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  // Read once at mount. The effect below clears this from history, and it must
  // not re-run (and refetch the venue) when it does — a ref is not reactive.
  const requestedEditRef = useRef(location.state?.editEventId ?? null)
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
  const [savingVenue, setSavingVenue] = useState(false)
  const [venueError, setVenueError] = useState(null)
  const [portalBusy, setPortalBusy] = useState(false)
  const [portalError, setPortalError] = useState(null)
  // Repeating events (new events only) and editing a run of them.
  const [repeat, setRepeat] = useState('none')
  const [repeatUntil, setRepeatUntil] = useState('')
  const [editingEvent, setEditingEvent] = useState(null)
  const [applyToSeries, setApplyToSeries] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [stats, setStats] = useState({})
  const [uploadingCover, setUploadingCover] = useState(false)
  const teamRef = useRef(null)
  const reloadEvents = useReloadEvents()

  // On success this navigates away to Stripe, so `portalBusy` is deliberately
  // left true — the button stays disabled for the moment before the page goes,
  // rather than flicking back and inviting a second click.
  async function openPortal() {
    setPortalError(null)
    setPortalBusy(true)
    try {
      await openBillingPortal(venue)
    } catch (err) {
      setPortalError(err.message || 'Could not open the billing portal.')
      setPortalBusy(false)
    }
  }

  async function loadEvents(venueId) {
    const [upcoming, past] = await Promise.all([
      fetchVenueEvents(venueId),
      fetchPastVenueEvents(venueId),
    ])
    setUpcomingEvents(upcoming)
    setPastEvents(past)
    return [...upcoming, ...past]
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
      const loads = [loadEvents(v.id), fetchVenueEventStats(v.id).then(setStats).catch(() => {})]
      if (v.memberRole === 'admin') {
        loads.push(fetchVenueMembers(v.id).then(setMembers).catch(() => {}))
      }
      const [allEvents] = await Promise.all(loads)
      if (!active) return
      setLoading(false)

      // Arrived from the Upcoming/Past lists, which span every venue and have
      // no editor of their own. Open the event they picked.
      const wanted = requestedEditRef.current
      if (wanted) {
        requestedEditRef.current = null
        const ev = allEvents.find(e => String(e.id) === String(wanted))
        if (ev) handleEdit(ev)
        // Consume it, so going back or refreshing does not reopen the editor.
        navigate(location.pathname, { replace: true, state: null })
      }
    })
    return () => { active = false }
    // navigate and location.pathname are stable for a given route; including
    // them would refetch the venue when the editor state is cleared below.
  }, [id])  // eslint-disable-line react-hooks/exhaustive-deps

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
      end_time: form.end_time || null,
      price: form.price === '' ? 0 : Number(form.price),
      capacity: form.capacity ? Number(form.capacity) : null,
      ticket_url: form.ticket_url || null,
      description: form.description,
      image_url: form.image_url || null,
      special_offer: form.special_offer?.trim() || null,
    }
    const dates = editingId ? [form.date] : repeatDates(repeat, form.date, repeatUntil)
    try {
      if (editingId) {
        await updateEvent(editingId, fields)
        const later = applyToSeries ? laterInSeries(editingEvent) : []
        if (later.length) {
          await updateEventSeriesFrom(editingEvent.series_id, editingEvent.date, fields)
          setSuccess(`Updated this and ${later.length} later date${later.length === 1 ? '' : 's'}!`)
        } else {
          setSuccess('Event updated!')
        }
      } else if (dates.length > 1) {
        await createEventSeries(venue.id, fields, dates)
        setSuccess(`Posted ${dates.length} dates!`)
      } else {
        await createEvent(venue.id, fields)
        setSuccess('Event posted!')
      }
      await loadEvents(venue.id)
      setForm(BLANK_EVENT)
      setEditingId(null)
      setEditingEvent(null)
      reloadEvents()
      setTimeout(() => { setSuccess(null); setView('main') }, 1500)
    } catch {
      setError(editingId ? 'Could not update event.' : 'Could not post event. Please try again.')
    }
    setSaving(false)
  }

  function resetEventExtras() {
    setRepeat('none')
    setRepeatUntil('')
    setApplyToSeries(false)
    setEditingEvent(null)
    setSuccess(null)
    setError(null)
  }

  function startAddEvent() {
    // A new venue's events are mostly one kind; start from the last one used.
    const lastCategory = [...upcomingEvents, ...pastEvents]
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]?.category
    setForm({ ...BLANK_EVENT, category: lastCategory || BLANK_EVENT.category })
    setEditingId(null)
    resetEventExtras()
    setView('add')
  }

  // Everything about the event except its date, as a new event. The usual
  // "same again next month" for anything that isn't a regular series.
  function duplicateEvent() {
    setForm(f => ({ ...f, date: '' }))
    setEditingId(null)
    resetEventExtras()
    setSuccess('Copied — pick a date and post.')
    window.scrollTo(0, 0)
  }

  // Dates in the same series after this one, from what the page has loaded.
  function laterInSeries(ev) {
    if (!ev?.series_id) return []
    return upcomingEvents.filter(e => e.series_id === ev.series_id && e.date > ev.date)
  }

  function handleEdit(ev) {
    setForm({
      name: ev.name,
      category: ev.category,
      date: ev.date,
      time: ev.time?.slice(0, 5) || '',
      end_time: ev.end_time?.slice(0, 5) || '',
      price: ev.price ?? '',
      capacity: ev.capacity ?? '',
      ticket_url: ev.ticket_url ?? '',
      description: ev.description ?? '',
      image_url: ev.image_url ?? '',
      special_offer: ev.special_offer ?? '',
    })
    setEditingId(ev.id)
    resetEventExtras()
    setEditingEvent(ev)
    setView('add')
  }

  async function handleDelete(ev) {
    // Part of a run with dates still to come: ask which, in the row itself.
    if (laterInSeries(ev).length) { setPendingDelete(ev.id); return }
    if (!confirm('Delete this event?')) return
    await deleteOne(ev.id)
  }

  async function deleteOne(eventId) {
    setPendingDelete(null)
    await deleteEvent(eventId)
    setUpcomingEvents(prev => prev.filter(e => e.id !== eventId))
    setPastEvents(prev => prev.filter(e => e.id !== eventId))
    reloadEvents()
  }

  async function deleteFrom(ev) {
    setPendingDelete(null)
    await deleteEventSeriesFrom(ev.series_id, ev.date)
    await loadEvents(venue.id)
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
      type: resolveVenueType(venue.type) || VENUE_TYPES[0],
      about: venue.about ?? '',
      instagram: venue.instagram ? `@${venue.instagram}` : '',
      opening_hours: venue.opening_hours ?? '',
      cover_image_url: venue.cover_image_url ?? '',
    })
    setGeocoded({ lat: venue.lat, lng: venue.lng, display: venue.address })
    setVenueError(null)
    setView('edit-venue')
  }

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    setVenueError(null)
    try {
      const url = await uploadEventImage(file)
      setVenueForm(f => ({ ...f, cover_image_url: url }))
    } catch {
      setVenueError('Could not upload the photo. Please try a smaller JPG or PNG.')
    }
    setUploadingCover(false)
  }

  function showTeam() {
    teamRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    teamRef.current?.querySelector('input')?.focus({ preventScroll: true })
  }

  function setVF(field) {
    return e => setVenueForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSaveVenue(e) {
    e.preventDefault()
    if (!geocoded) { setVenueError('Find your address and confirm the pin first.'); return }
    const instagram = normalizeInstagram(venueForm.instagram)
    if (instagram === false) { setVenueError("That Instagram name doesn't look right — just the handle, like @thecrookedlantern."); return }
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
        about: venueForm.about.trim() || null,
        instagram,
        opening_hours: venueForm.opening_hours.trim() || null,
        cover_image_url: venueForm.cover_image_url || null,
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
          <button className="vl-add-btn" onClick={() => navigate(VENUE_HOME)}>← Back to My Venues</button>
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
          <button className="vp-back-link" onClick={() => { setView('main'); setEditingId(null); resetEventExtras() }}>← Back</button>
          {success && <div className="success-banner">🎉 {success}</div>}
          {error && <p className="form-error">{error}</p>}
          <div className="form-heading-row">
            <h3 className="section-heading">{editingId ? 'Edit Event' : 'New Event'}</h3>
            {editingId && (
              <div className="form-heading-actions">
                <button type="button" className="view-public-link" onClick={duplicateEvent}>
                  Duplicate
                </button>
                <button
                  type="button"
                  className="view-public-link"
                  onClick={() => navigate(`/manage/preview/event/${editingId}`)}
                >
                  Preview ↗
                </button>
              </div>
            )}
          </div>
          {editingId && stats[editingId] && (
            <EventStats stats={stats[editingId]} className="form-stats" />
          )}
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
                Start time
                <input type="time" required value={form.time} onChange={set('time')} />
              </label>
            </div>
            {!editingId && (
              <div className="repeat-box">
                <div className="form-row">
                  <label>
                    Repeats
                    <select
                      value={repeat}
                      onChange={e => {
                        setRepeat(e.target.value)
                        if (!repeatUntil) setRepeatUntil(defaultUntil(form.date))
                      }}
                    >
                      {REPEAT_OPTIONS.map(r => (
                        <option key={r} value={r}>
                          {{ none: "Doesn't repeat", weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly' }[r]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {repeat !== 'none' && (
                    <label>
                      Until
                      <input
                        type="date"
                        required
                        value={repeatUntil}
                        min={form.date || undefined}
                        max={maxUntil(form.date) || undefined}
                        onChange={e => setRepeatUntil(e.target.value)}
                      />
                    </label>
                  )}
                </div>
                {repeat !== 'none' && (
                  form.date ? (
                    <p className="form-note">
                      {describeRepeat(repeat, form.date)} · {repeatDates(repeat, form.date, repeatUntil).length} dates.
                      Each one is listed separately, and you can change or cancel any of them later.
                    </p>
                  ) : (
                    <p className="form-note">Pick the first date above.</p>
                  )
                )}
              </div>
            )}
            <div className="form-row">
              <label>
                End time (optional)
                <input type="time" value={form.end_time} onChange={set('end_time')} />
              </label>
              {/* An end before the start is a night running past midnight, not
                  a mistake — say so, rather than rejecting it. */}
              {endsNextDay(form.time, form.end_time) && (
                <p className="form-note">Ends {form.end_time} the next day.</p>
              )}
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
            {editingId && laterInSeries(editingEvent).length > 0 && (
              <label className="check-row">
                <input type="checkbox" checked={applyToSeries} onChange={e => setApplyToSeries(e.target.checked)} />
                <span>
                  Also change the {laterInSeries(editingEvent).length} later date{laterInSeries(editingEvent).length === 1 ? '' : 's'} in this series
                  <small>Everything except the date is copied to them.</small>
                </span>
              </label>
            )}
            <button type="submit" className="post-btn" disabled={saving || uploading}>
              {saving ? 'Saving…'
                : editingId ? 'Save Changes'
                : repeat !== 'none' && form.date ? `Post ${repeatDates(repeat, form.date, repeatUntil).length} dates`
                : 'Post Event'}
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
              <input required value={venueForm.name} onChange={setVF('name')} placeholder="e.g. The Crooked Lantern" />
            </label>
            <AddressPicker
              address={venueForm.address}
              onAddressChange={next => setVenueForm(f => ({ ...f, address: next }))}
              value={geocoded}
              onChange={setGeocoded}
            />
            <label>
              Venue type
              <select value={venueForm.type} onChange={setVF('type')}>
                {venueTypeOptions(venue.type).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <div className="form-row">
              <label>
                Phone (optional)
                <input value={venueForm.phone} onChange={setVF('phone')} placeholder="e.g. 020 7946 0000" />
              </label>
              <label>
                Capacity (optional)
                <input type="number" min="1" value={venueForm.capacity} onChange={setVF('capacity')} placeholder="e.g. 200" />
              </label>
            </div>
            <label>
              Website (optional)
              <input value={venueForm.website} onChange={setVF('website')} placeholder="e.g. example.com" />
            </label>
            <h4 className="form-subheading">Your public page</h4>
            <p className="form-note">What customers see when they tap your venue. All optional, but a photo and a line about you make a big difference.</p>
            <label>
              Cover photo
              {venueForm.cover_image_url && (
                <div className="image-preview" style={{ backgroundImage: `url(${venueForm.cover_image_url})` }}>
                  <button type="button" className="image-remove" onClick={() => setVenueForm(f => ({ ...f, cover_image_url: '' }))}>
                    Remove
                  </button>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleCoverUpload} disabled={uploadingCover} />
              {uploadingCover && <span className="upload-hint">Uploading…</span>}
            </label>
            <label>
              About
              <textarea
                value={venueForm.about}
                onChange={setVF('about')}
                rows={3}
                maxLength={500}
                placeholder="e.g. Proper local with a beer garden, Sky Sports on three screens and a quiz every Tuesday."
              />
            </label>
            <div className="form-row">
              <label>
                Instagram
                <input value={venueForm.instagram} onChange={setVF('instagram')} placeholder="@yourvenue" autoCapitalize="none" autoCorrect="off" />
              </label>
              <label>
                Opening hours
                <input value={venueForm.opening_hours} onChange={setVF('opening_hours')} maxLength={200} placeholder="e.g. Mon–Sun 12–11pm" />
              </label>
            </div>
            <button type="submit" className="post-btn" disabled={savingVenue || !geocoded || uploadingCover}>
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
        {/* "Verified" was true of every venue you can open here, so it told
            you nothing. What you actually want at a glance is whether there
            is anything listed. */}
        <span className={`venue-stat-badge ${upcomingEvents.length === 0 ? 'is-empty' : ''}`}>
          {upcomingEvents.length === 0
            ? 'No events yet'
            : `${upcomingEvents.length} upcoming`}
        </span>
      </Header>

      <button className="vp-back-link vp-back-pad" onClick={() => navigate(VENUE_HOME)}>← My Venues</button>

      {/* Directly above the subscription card, so the warning and the button
          that resolves it read as one block. */}
      {isAdmin && <VenueAttention venue={venue} />}

      {isAdmin && (
        <VenueChecklist
          venue={venue}
          hasEvents={upcomingEvents.length + pastEvents.length > 0}
          hasTeam={members.length > 1}
          onAddEvent={startAddEvent}
          onEditProfile={startEditVenue}
          onAddTeam={showTeam}
        />
      )}

      {/* Subscription card — admin only */}
      {isAdmin && (
        <div className={`vm-sub-card ${subState === 'archived' ? 'vm-sub-lapsed' : subState === 'active' ? 'vm-sub-active' : 'vm-sub-trial'}`}>
          <div className="vm-sub-row">
            <span className="vm-sub-label">
              {subState === 'active' && '✓ Active subscription'}
              {subState === 'trialing' && `Free trial — ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
              {subState === 'archived' && '⚠ Venue archived — events hidden'}
            </span>
            {subState !== 'active' && !isNative() && (
              <button className="vm-sub-btn" onClick={() => startCheckout(venue)}>
                {subState === 'archived' ? 'Reactivate' : 'Subscribe'} — £20/mo
              </button>
            )}
            {/* Cancelling, changing a card and downloading invoices all happen
                in Stripe's portal rather than being rebuilt here. Only shown
                once there is a subscription to manage — a venue still in its
                free trial has no Stripe customer, so the portal would have
                nothing to open. */}
            {subState === 'active' && !isNative() && (
              <button
                className="vm-sub-btn vm-sub-btn-quiet"
                disabled={portalBusy}
                onClick={openPortal}
              >
                {portalBusy ? 'Opening…' : 'Manage subscription'}
              </button>
            )}
          </div>
          {portalError && <p className="vm-sub-error">{portalError}</p>}
          {/* Natively there is no button, no price and no link. Both stores
              require in-app purchases of digital services to use their own
              billing, and a link out to Stripe is the specific thing Apple's
              3.1.1 prohibits — so the app reports the state and says where the
              controls are without steering anyone to a payment page. */}
          {isNative() && (
            <p className="vm-sub-note">
              {subState === 'active'
                ? 'Subscriptions, including cancellation, are managed from a web browser.'
                : 'Subscriptions are managed from a web browser.'}
            </p>
          )}
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
          <span className="vm-detail-value">{resolveVenueType(venue.type) || '—'}</span>
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
        {venue.instagram && (
          <div className="vm-detail-row">
            <span className="vm-detail-label">Instagram</span>
            <a className="vm-detail-value vm-detail-link" href={`https://instagram.com/${venue.instagram}`} target="_blank" rel="noopener noreferrer">
              @{venue.instagram}
            </a>
          </div>
        )}
        {venue.opening_hours && (
          <div className="vm-detail-row">
            <span className="vm-detail-label">Hours</span>
            <span className="vm-detail-value">{venue.opening_hours}</span>
          </div>
        )}
        {venue.about && <p className="vm-about">{venue.about}</p>}
        {venue.cover_image_url && (
          <div className="vm-cover" style={{ backgroundImage: `url(${venue.cover_image_url})` }} role="img" aria-label="Cover photo" />
        )}
        <button className="vm-public-link" onClick={() => navigate(`/manage/preview/venue/${venue.id}`)}>
          See your public page ↗
        </button>
      </div>

      {/* Team — admin only */}
      {isAdmin && (
        <div className="vm-section" ref={teamRef}>
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

      {/* Totals across every event, past and upcoming */}
      {upcomingEvents.length + pastEvents.length > 0 && (
        <AudienceTotals stats={stats} />
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
              if (pendingDelete === event.id) {
                return (
                  <div key={event.id} className="venue-event-row vc-confirm">
                    <span className="vc-confirm-text">Delete {event.name} on {dateLabel}…</span>
                    <div className="vc-confirm-actions">
                      <button onClick={() => deleteOne(event.id)}>Just this date</button>
                      <button onClick={() => deleteFrom(event)}>This and {laterInSeries(event).length} later</button>
                      <button className="is-quiet" onClick={() => setPendingDelete(null)}>Cancel</button>
                    </div>
                  </div>
                )
              }
              return (
                <div key={event.id} className="venue-event-row">
                  <button
                    className="vc-open"
                    onClick={() => handleEdit(event)}
                    aria-label={`Edit ${event.name}`}
                  >
                    <span className="vc-dot" style={{ background: cat.color }} />
                    <span className="vc-info">
                      <span className="vc-name">{event.name}</span>
                      <span className="vc-meta">
                        <span className="vc-cat" style={{ color: cat.color }}>{cat.label}</span>
                        &nbsp;·&nbsp;{dateLabel}
                        &nbsp;·&nbsp;{formatTimeRange(event.time?.slice(0, 5), event.end_time?.slice(0, 5))}
                        &nbsp;·&nbsp;{Number(event.price) === 0 ? 'Free' : `£${event.price}`}
                        {event.series_id && <>&nbsp;·&nbsp;<span className="vc-repeat" title="Part of a repeating series">↻</span></>}
                      </span>
                      {stats[event.id] && <EventStats stats={stats[event.id]} />}
                    </span>
                  </button>
                  <button className="delete-event-btn" onClick={() => handleDelete(event)} aria-label="Delete event">✕</button>
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

function plural(n, one, many = `${one}s`) {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`
}

// "23 views · 14 saved · 6 going" under an event.
function EventStats({ stats, className = '' }) {
  return (
    <span className={`vc-stats ${className}`}>
      {plural(stats.views, 'view')} · {stats.saves.toLocaleString()} saved · {stats.going.toLocaleString()} going
    </span>
  )
}

function AudienceTotals({ stats }) {
  const rows = Object.values(stats)
  const sum = key => rows.reduce((n, r) => n + (r[key] || 0), 0)
  const items = [
    { label: 'Views', value: sum('views'), hint: 'times your events were opened' },
    { label: 'Saved', value: sum('saves'), hint: 'people saved an event' },
    { label: 'Going', value: sum('going'), hint: 'said they are going' },
  ]
  return (
    <div className="vm-totals" aria-label="Your audience, all events">
      {items.map(i => (
        <div key={i.label} className="vm-total">
          <span className="vm-total-value">{i.value.toLocaleString()}</span>
          <span className="vm-total-label">{i.label}</span>
        </div>
      ))}
      <p className="vm-totals-note">Across all your events so far. Views by your own team aren't counted.</p>
    </div>
  )
}

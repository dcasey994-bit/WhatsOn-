import { supabase } from '../lib/supabase.js'
import { getUser } from './authStore.js'

// Geocode a UK address using Nominatim (OpenStreetMap) — no API key needed
export async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?` +
    new URLSearchParams({ q: address, format: 'json', limit: '1', countrycodes: 'gb' })
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'WhatsOn-App/1.0' },
  })
  if (!res.ok) throw new Error('Geocoding request failed')
  const data = await res.json()
  if (!data.length) throw new Error('Address not found')
  return { lat: Number(data[0].lat), lng: Number(data[0].lon), display: data[0].display_name }
}

// Ensures a bare "example.com" is stored as a valid absolute URL
export function normalizeWebsite(url) {
  const trimmed = (url || '').trim()
  if (!trimmed) return null
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

// Convert a DB event row (with joined venue) to the shape the UI expects
export function dbEventToLocal(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    venue: row.venues?.name || '',
    venueId: row.venue_id,
    address: row.venues?.address || '',
    lat: row.venues?.lat ?? 51.4435,
    lng: row.venues?.lng ?? -0.1527,
    time: row.time?.slice(0, 5) || '',
    date: formatDate(row.date),
    dateKey: row.date,
    startsAt: `${row.date}T${row.time || '00:00'}`,
    price: Number(row.price) || 0,
    distance: null,
    description: row.description || '',
    lineup: [],
    likes: 0,
    views: 0,
    saves: 0,
    capacity: row.capacity || null,
    ticketsLeft: null,
    ticket_url: row.ticket_url || null,
    artist_bio: '',
    image: row.image_url || null,
    specialOffer: row.special_offer || null,
    fromDB: true,
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const today = new Date()
  const d = new Date(dateStr + 'T00:00:00')
  const diff = Math.round((d - new Date(today.toDateString())) / 86400000)
  if (diff === 0) return 'Tonight'
  if (diff === 1) return 'Tomorrow'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

// ── Public event fetching ─────────────────────────────────────────────────

export async function fetchUpcomingEvents() {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('events')
    .select('*, venues(name, address, lat, lng)')
    .gte('date', today)
    .order('date', { ascending: true })
    .order('time', { ascending: true })
  if (error) throw error
  return (data || []).map(dbEventToLocal)
}

// A single event by id, in the UI shape (used by the detail page as a fallback
// when the event isn't in the live map context — e.g. past events)
export async function fetchEventById(eventId) {
  const { data } = await supabase
    .from('events')
    .select('*, venues(name, address, lat, lng)')
    .eq('id', eventId)
    .maybeSingle()
  return data ? dbEventToLocal(data) : null
}

// Saved events are looked up by id rather than filtered out of the upcoming
// list, because a saved event that has already happened still belongs on the
// Saved page — filtering the upcoming list made it vanish the morning after.
//
// Ids written before events lived in the database were plain integers, and
// asking Postgres to compare one against a uuid column is an error rather than
// a miss, so anything that is not a uuid is dropped here.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function fetchEventsByIds(ids) {
  const usable = [...ids].map(String).filter(id => UUID.test(id))
  if (!usable.length) return []
  const { data, error } = await supabase
    .from('events')
    .select('*, venues(name, address, lat, lng)')
    .in('id', usable)
    .order('date', { ascending: true })
    .order('time', { ascending: true })
  if (error) throw error
  return (data || []).map(dbEventToLocal)
}

// All events across the current user's venues, chronological. period: 'upcoming' | 'past'
export async function fetchMyVenueEvents(period) {
  const venues = await fetchMyVenues()
  const ids = venues.map(v => v.id)
  if (!ids.length) return []
  const today = new Date().toISOString().split('T')[0]
  let q = supabase
    .from('events')
    .select('*, venues(name, address, lat, lng)')
    .in('venue_id', ids)
  if (period === 'past') {
    q = q.lt('date', today).order('date', { ascending: false }).order('time', { ascending: false })
  } else {
    q = q.gte('date', today).order('date', { ascending: true }).order('time', { ascending: true })
  }
  const { data, error } = await q
  if (error) throw error
  return (data || []).map(dbEventToLocal)
}

// ── Public venue profiles ──────────────────────────────────────────────────

export async function fetchVenueById(venueId) {
  const user = getUser()
  const [venueRes, memberRes] = await Promise.all([
    supabase.from('venues').select('*').eq('id', venueId).maybeSingle(),
    user
      ? supabase.from('venue_members').select('role').eq('venue_id', venueId).eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  if (!venueRes.data) return null
  return { ...venueRes.data, memberRole: memberRes.data?.role || null }
}

// All venues that are currently visible (active or still in free trial) — for the venues map
export async function fetchAllVenues() {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
  if (error) throw error
  return (data || []).filter(v => getSubscriptionState(v) !== 'archived')
}

// Upcoming events for one venue, in the UI shape (used by the public profile page)
export async function fetchPublicVenueEvents(venueId) {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('events')
    .select('*, venues(name, address, lat, lng)')
    .eq('venue_id', venueId)
    .gte('date', today)
    .order('date', { ascending: true })
    .order('time', { ascending: true })
  if (error) throw error
  return (data || []).map(dbEventToLocal)
}

// ── Venue management ──────────────────────────────────────────────────────

// All venues the current user is a member of (any role), with memberRole attached
export async function fetchMyVenues() {
  const user = getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('venue_members')
    .select('role, venues(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
  if (error) throw error
  // The embed is null when the venue row can't be read — deleted, or hidden by
  // RLS. Without this guard those become objects with no venue fields, which
  // getSubscriptionState() reports as 'archived', rendering blank ghost cards.
  return (data || [])
    .filter(row => row.venues)
    .map(row => ({ ...row.venues, memberRole: row.role }))
}

export async function registerVenue(fields) {
  const user = getUser()
  if (!user) throw new Error('Not logged in')
  const trialEndsAt = new Date()
  trialEndsAt.setMonth(trialEndsAt.getMonth() + 3)
  const { data: venue, error } = await supabase
    .from('venues')
    .insert({
      ...fields,
      user_id: user.id,
      subscription_status: 'trialing',
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .select()
    .single()
  if (error) throw error
  // Make the creator an admin in venue_members
  await supabase.from('venue_members').insert({
    venue_id: venue.id,
    user_id: user.id,
    role: 'admin',
  })
  return venue
}

// Update a venue's own details (admins only — enforced by RLS)
export async function updateVenue(venueId, fields) {
  const { data, error } = await supabase
    .from('venues')
    .update(fields)
    .eq('id', venueId)
    .select()
    .single()
  if (error) throw error
  return data
}

// Returns 'active' | 'trialing' | 'archived'
export function getSubscriptionState(venue) {
  if (!venue) return 'archived'
  if (venue.subscription_status === 'active') return 'active'
  if (venue.subscription_status === 'trialing' && venue.trial_ends_at) {
    return new Date(venue.trial_ends_at) > new Date() ? 'trialing' : 'archived'
  }
  return 'archived'
}

export function trialDaysLeft(venue) {
  if (!venue?.trial_ends_at) return 0
  const diff = new Date(venue.trial_ends_at) - new Date()
  return Math.max(0, Math.ceil(diff / 86400000))
}

// Redirect to the Stripe Payment Link, tagging the venue so the webhook can
// activate the right subscription after checkout.
export function startCheckout(venue) {
  const link = import.meta.env.VITE_STRIPE_PAYMENT_LINK
  if (!link || !venue) return
  const user = getUser()
  const sep = link.includes('?') ? '&' : '?'
  const url = `${link}${sep}client_reference_id=${venue.id}` +
    (user?.email ? `&prefilled_email=${encodeURIComponent(user.email)}` : '')
  window.location.href = url
}

// ── Venue member management ───────────────────────────────────────────────

// Returns [{user_id, email, role, created_at}] for a venue (admin only)
export async function fetchVenueMembers(venueId) {
  const { data, error } = await supabase.rpc('get_venue_members', { vid: venueId })
  if (error) throw error
  return data || []
}

// Add a member by email address (person must already have a WhatsOn account)
export async function addVenueMember(venueId, email, role) {
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()
  if (pErr) throw pErr
  if (!profile) throw new Error('No account found with that email. They need to sign in to WhatsOn first.')
  const { error } = await supabase
    .from('venue_members')
    .insert({ venue_id: venueId, user_id: profile.id, role })
  if (error) {
    if (error.code === '23505') throw new Error('This person already has access to this venue.')
    throw error
  }
}

export async function removeVenueMember(venueId, userId) {
  const { error } = await supabase
    .from('venue_members')
    .delete()
    .eq('venue_id', venueId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function updateMemberRole(venueId, userId, role) {
  const { error } = await supabase
    .from('venue_members')
    .update({ role })
    .eq('venue_id', venueId)
    .eq('user_id', userId)
  if (error) throw error
}

// ── Venue event management ────────────────────────────────────────────────

export async function fetchVenueEvents(venueId) {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('venue_id', venueId)
    .gte('date', today)
    .order('date', { ascending: true })
    .order('time', { ascending: true })
  if (error) throw error
  return data || []
}

export async function fetchPastVenueEvents(venueId) {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('venue_id', venueId)
    .lt('date', today)
    .order('date', { ascending: false })
    .order('time', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createEvent(venueId, fields) {
  const { data, error } = await supabase
    .from('events')
    .insert({ ...fields, venue_id: venueId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEvent(eventId, fields) {
  const { data, error } = await supabase
    .from('events')
    .update(fields)
    .eq('id', eventId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteEvent(eventId) {
  const { error } = await supabase.from('events').delete().eq('id', eventId)
  if (error) throw error
}

// ── Event images (Supabase Storage) ─────────────────────────────────────────

// Upload a file to the public `event-images` bucket and return its public URL
export async function uploadEventImage(file) {
  const user = getUser()
  if (!user) throw new Error('Not logged in')
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${user.id}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('event-images')
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('event-images').getPublicUrl(path)
  return data.publicUrl
}

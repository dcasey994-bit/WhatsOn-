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

// ── Public venue profiles ──────────────────────────────────────────────────

export async function fetchVenueById(venueId) {
  const { data } = await supabase
    .from('venues')
    .select('*')
    .eq('id', venueId)
    .maybeSingle()
  return data || null
}

// All venues that are currently visible (active or still in free trial) — for the venues map
export async function fetchAllVenues() {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
  if (error) throw error
  return (data || []).filter(v => {
    const s = getSubscriptionState(v)
    return s === 'active' || s === 'trialing'
  })
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

export async function fetchMyVenue() {
  const user = getUser()
  if (!user) return null
  const { data } = await supabase
    .from('venues')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  return data || null
}

export async function registerVenue(fields) {
  const user = getUser()
  if (!user) throw new Error('Not logged in')
  const trialEndsAt = new Date()
  trialEndsAt.setMonth(trialEndsAt.getMonth() + 3)
  const { data, error } = await supabase
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
  return data
}

// Returns 'active' | 'trialing' | 'lapsed'
export function getSubscriptionState(venue) {
  if (!venue) return 'lapsed'
  if (venue.subscription_status === 'active') return 'active'
  if (venue.subscription_status === 'trialing' && venue.trial_ends_at) {
    return new Date(venue.trial_ends_at) > new Date() ? 'trialing' : 'lapsed'
  }
  return 'lapsed'
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

import { supabase } from '../lib/supabase.js'
import { getUser } from './authStore.js'

// Approximate coordinates for each area — used when registering a venue
export const AREA_COORDS = {
  'Clapham':  { lat: 51.4618, lng: -0.1400 },
  'Balham':   { lat: 51.4435, lng: -0.1527 },
  'Tooting':  { lat: 51.4280, lng: -0.1680 },
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
    image: null,
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
  const { data, error } = await supabase
    .from('venues')
    .insert({ ...fields, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
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

export async function createEvent(venueId, fields) {
  const { data, error } = await supabase
    .from('events')
    .insert({ ...fields, venue_id: venueId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteEvent(eventId) {
  const { error } = await supabase.from('events').delete().eq('id', eventId)
  if (error) throw error
}

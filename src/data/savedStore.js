import { supabase } from '../lib/supabase.js'
import { getUser } from './authStore.js'

const LS_SAVED = 'whatson_saved'
const LS_GOING = 'whatson_going'

let listeners = []
function notify() { listeners.forEach(fn => fn()) }

function localGet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')) } catch { return new Set() }
}
function localSet(key, set) {
  localStorage.setItem(key, JSON.stringify([...set]))
}

// ── Saved ──────────────────────────────────────────────────────────────────

export function isSaved(id) { return localGet(LS_SAVED).has(id) }
export function getSavedIds() { return localGet(LS_SAVED) }

export async function toggleSaved(id) {
  const set = localGet(LS_SAVED)
  const user = getUser()
  if (set.has(id)) {
    set.delete(id)
    if (user) await supabase.from('saved_events').delete().match({ user_id: user.id, event_id: id })
  } else {
    set.add(id)
    if (user) await supabase.from('saved_events').upsert({ user_id: user.id, event_id: id })
  }
  localSet(LS_SAVED, set)
  notify()
}

export async function loadSavedFromDB() {
  const user = getUser()
  if (!user) return
  const { data } = await supabase.from('saved_events').select('event_id').eq('user_id', user.id)
  if (data) {
    localSet(LS_SAVED, new Set(data.map(r => r.event_id)))
    notify()
  }
}

// ── Going ──────────────────────────────────────────────────────────────────

export function isGoing(id) { return localGet(LS_GOING).has(id) }

export async function toggleGoing(id) {
  const set = localGet(LS_GOING)
  const user = getUser()
  if (set.has(id)) {
    set.delete(id)
    if (user) await supabase.from('going_events').delete().match({ user_id: user.id, event_id: id })
  } else {
    set.add(id)
    if (user) await supabase.from('going_events').upsert({ user_id: user.id, event_id: id })
  }
  localSet(LS_GOING, set)
  notify()
}

// ── Subscribe ──────────────────────────────────────────────────────────────

export function subscribe(fn) {
  listeners.push(fn)
  return () => { listeners = listeners.filter(l => l !== fn) }
}

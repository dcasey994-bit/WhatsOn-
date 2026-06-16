import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

// Aggregate "X going" counts per event, read from the public `going_counts` view.
// Self toggles bump the count optimistically; a full reload syncs everyone else.

let counts = {}        // event_id (string) -> number
let listeners = []
function notify() { listeners.forEach(fn => fn()) }

export async function loadGoingCounts() {
  const { data, error } = await supabase.from('going_counts').select('event_id, count')
  if (error || !data) return
  const next = {}
  data.forEach(r => { next[String(r.event_id)] = Number(r.count) })
  counts = next
  notify()
}

export function getGoingCount(id) { return counts[String(id)] || 0 }

// Optimistic local adjustment when the current user toggles "going"
export function bumpGoingCount(id, delta) {
  id = String(id)
  counts[id] = Math.max(0, (counts[id] || 0) + delta)
  notify()
}

export function subscribeGoing(fn) {
  listeners.push(fn)
  return () => { listeners = listeners.filter(l => l !== fn) }
}

export function useGoingCount(id) {
  const [n, setN] = useState(() => getGoingCount(id))
  useEffect(() => {
    setN(getGoingCount(id))
    return subscribeGoing(() => setN(getGoingCount(id)))
  }, [id])
  return n
}

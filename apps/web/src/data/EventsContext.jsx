import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { isNative } from '../lib/platform.js'
import { fetchUpcomingEvents, dbEventToLocal } from './eventsStore.js'

const EventsContext = createContext({ events: [], reload: () => {}, error: false, loading: true })

// How old the list may be before returning to the app is worth a refetch.
// Realtime keeps things current while the app is open; this covers the case
// where it was not — asleep in the background, or offline.
const STALE_AFTER_MS = 5 * 60 * 1000

const byStartTime = (a, b) => (a.startsAt || a.time).localeCompare(b.startsAt || b.time)

export function EventsProvider({ children }) {
  const [events, setEvents] = useState([])
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  // undefined = we have not heard back from Supabase about who we are yet.
  // null = definitely signed out. A string = that user's id.
  const [userId, setUserId] = useState(undefined)

  const lastLoadedAt = useRef(0)

  // `silent` skips the loading state, so a background refresh does not blank
  // out a screen the user is already looking at.
  const load = useCallback(async (opts) => {
    const silent = opts?.silent === true
    if (!silent) setLoading(true)
    try {
      setEvents(await fetchUpcomingEvents())
      setError(false)
    } catch {
      setError(true)
    }
    lastLoadedAt.current = Date.now()
    setLoading(false)
  }, [])

  const reloadIfStale = useCallback(() => {
    if (Date.now() - lastLoadedAt.current > STALE_AFTER_MS) load({ silent: true })
  }, [load])

  // Which events are visible depends entirely on who is asking — the demo
  // account sees demo data, everyone else sees live data, and that is enforced
  // by RLS. So the fetch has to wait for the session and re-run when it
  // changes. Previously it ran once on mount, which meant signing in left the
  // app holding the empty list it had fetched while signed out.
  useEffect(() => {
    let active = true

    // Sessions are restored from storage asynchronously, so on a cold start
    // this can resolve after the first render.
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (active) setUserId(session?.user?.id ?? null)
      })
      .catch(() => { if (active) setUserId(null) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Only a change of identity matters. Token refreshes fire this too and
      // keep the same id; returning `prev` makes React skip the re-render.
      const next = session?.user?.id ?? null
      setUserId(prev => (prev === next ? prev : next))
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (userId === undefined) return   // still resolving — stay in the loading state
    load()

    // Pull one row and reconcile it into the list. The realtime payload alone
    // is not enough — it carries no joined venue, and for an UPDATE it cannot
    // say whether the row is still visible to this user under RLS.
    const syncRow = async id => {
      const { data } = await supabase
        .from('events')
        .select('*, venues(name, address, lat, lng)')
        .eq('id', id)
        // maybeSingle, not single: zero rows is a legitimate answer here — the
        // event may have been edited out of view rather than deleted.
        .maybeSingle()

      const today = new Date().toISOString().split('T')[0]
      const drop = !data || data.date < today

      setEvents(prev => {
        const without = prev.filter(e => String(e.id) !== String(id))
        // Rescheduled into the past, or no longer ours to see.
        if (drop) return without
        return [...without, dbEventToLocal(data)].sort(byStartTime)
      })
    }

    // Live updates — new events appear on the map instantly, deletions
    // disappear, and edits (time changes, renames, offers) are picked up.
    const channel = supabase
      .channel('events-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events' },
        ({ new: row }) => syncRow(row.id)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events' },
        ({ new: row }) => syncRow(row.id)
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'events' },
        ({ old: row }) => {
          setEvents(prev => prev.filter(e => e.id !== row.id))
        }
      )
      .subscribe()

    // Rebuilt on identity change as well, so the realtime subscription is
    // authenticated as the current user rather than whoever opened the app.
    return () => supabase.removeChannel(channel)
  }, [userId, load])

  // Refetch when the app comes back to the foreground. This matters far more
  // in the native shell than on the web: a browser tab gets reloaded all the
  // time, whereas an Android app can sit in memory for days, and realtime
  // delivers nothing while the connection is asleep.
  useEffect(() => {
    if (isNative()) {
      let remove
      let cancelled = false
      import('@capacitor/app')
        .then(({ App }) =>
          App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) reloadIfStale()
          })
        )
        .then(handle => {
          if (cancelled) handle.remove()
          else remove = () => handle.remove()
        })
      return () => { cancelled = true; remove?.() }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') reloadIfStale()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [reloadIfStale])

  return (
    <EventsContext.Provider value={{ events, reload: load, error, loading }}>
      {children}
    </EventsContext.Provider>
  )
}

export function useEvents() {
  return useContext(EventsContext).events
}

export function useReloadEvents() {
  return useContext(EventsContext).reload
}

// True when the last events fetch failed
export function useEventsError() {
  return useContext(EventsContext).error
}

// True until the first fetch settles — lets pages tell "still loading" apart
// from "genuinely nothing on"
export function useEventsLoading() {
  return useContext(EventsContext).loading
}

export function useEvent(id) {
  const { events } = useContext(EventsContext)
  return events.find(e => String(e.id) === String(id)) ?? null
}

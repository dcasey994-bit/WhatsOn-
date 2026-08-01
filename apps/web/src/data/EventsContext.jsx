import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { fetchUpcomingEvents, dbEventToLocal } from './eventsStore.js'

const EventsContext = createContext({ events: [], reload: () => {}, error: false, loading: true })

export function EventsProvider({ children }) {
  const [events, setEvents] = useState([])
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  // undefined = we have not heard back from Supabase about who we are yet.
  // null = definitely signed out. A string = that user's id.
  const [userId, setUserId] = useState(undefined)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setEvents(await fetchUpcomingEvents())
      setError(false)
    } catch {
      setError(true)
    }
    setLoading(false)
  }, [])

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

    // Live updates — new events appear on map instantly, deletions disappear
    const channel = supabase
      .channel('events-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events' },
        async ({ new: row }) => {
          const { data } = await supabase
            .from('events')
            .select('*, venues(name, address, lat, lng)')
            .eq('id', row.id)
            .single()
          if (data) {
            const today = new Date().toISOString().split('T')[0]
            if (data.date >= today) {
              setEvents(prev => [...prev, dbEventToLocal(data)].sort(
                (a, b) => (a.startsAt || a.time).localeCompare(b.startsAt || b.time)
              ))
            }
          }
        }
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

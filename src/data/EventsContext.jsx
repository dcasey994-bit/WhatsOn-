import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { fetchUpcomingEvents, dbEventToLocal } from './eventsStore.js'

const EventsContext = createContext({ events: [], reload: () => {}, error: false, loading: true })

export function EventsProvider({ children }) {
  const [events, setEvents] = useState([])
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setEvents(await fetchUpcomingEvents())
      setError(false)
    } catch {
      setError(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
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

    return () => supabase.removeChannel(channel)
  }, [load])

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

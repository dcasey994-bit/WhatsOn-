import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { fetchUpcomingEvents, dbEventToLocal } from './eventsStore.js'
import { EVENTS } from './events.js'

const EventsContext = createContext(EVENTS)

export function EventsProvider({ children }) {
  const [events, setEvents] = useState(EVENTS)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      const rows = await fetchUpcomingEvents()
      if (rows.length > 0) setEvents(rows)
      setError(false)
    } catch {
      setError(true)
    }
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
              setEvents(prev => {
                // Replace mock events once real ones exist, else append
                const realOnly = prev.filter(e => e.fromDB)
                return [...realOnly, dbEventToLocal(data)].sort(
                  (a, b) => (a.startsAt || a.time).localeCompare(b.startsAt || b.time)
                )
              })
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'events' },
        ({ old: row }) => {
          setEvents(prev => {
            const next = prev.filter(e => e.id !== row.id)
            // Fall back to mock events if DB is now empty
            return next.some(e => e.fromDB) ? next : EVENTS
          })
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [load])

  return (
    <EventsContext.Provider value={{ events, reload: load, error }}>
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

// True when the last events fetch failed (the list may be stale or mock data)
export function useEventsError() {
  return useContext(EventsContext).error
}

export function useEvent(id) {
  const { events } = useContext(EventsContext)
  return events.find(e => String(e.id) === String(id)) ?? null
}

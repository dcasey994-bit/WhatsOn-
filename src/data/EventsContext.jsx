import { createContext, useContext, useState, useEffect } from 'react'
import { fetchUpcomingEvents } from './eventsStore.js'
import { EVENTS } from './events.js'

const EventsContext = createContext(EVENTS)

export function EventsProvider({ children }) {
  const [events, setEvents] = useState(EVENTS)

  useEffect(() => {
    fetchUpcomingEvents()
      .then(rows => { if (rows.length > 0) setEvents(rows) })
      .catch(() => {})
  }, [])

  return (
    <EventsContext.Provider value={events}>
      {children}
    </EventsContext.Provider>
  )
}

export function useEvents() {
  return useContext(EventsContext)
}

export function useEvent(id) {
  const events = useContext(EventsContext)
  // Match by string UUID (DB events) or coerced number (mock events)
  return events.find(e => String(e.id) === String(id)) ?? null
}

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEvents } from '../data/EventsContext.jsx'
import { fetchAllVenues, fetchEventsByIds } from '../data/eventsStore.js'
import { getSavedIds, getSavedVenueIds, unsaveEvents, subscribe } from '../data/savedStore.js'
import { getUser, subscribe as subscribeAuth } from '../data/authStore.js'
import { useView, useSwitchView, goingOutPath } from '../data/appMode.js'
import { todayKey } from '../data/dateFilter.js'
import Header from '../components/Header.jsx'
import ViewToggle from '../components/ViewToggle.jsx'
import EventCard from '../components/EventCard.jsx'
import VenueCard from '../components/VenueCard.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import './SavedPage.css'

export default function SavedPage() {
  const events = useEvents()
  const navigate = useNavigate()
  const view = useView()
  const switchView = useSwitchView()
  const [savedIds, setSavedIds] = useState(() => getSavedIds())
  const [savedVenueIds, setSavedVenueIds] = useState(() => getSavedVenueIds())
  const [user, setUser] = useState(() => getUser())
  const [venues, setVenues] = useState([])
  const [venuesError, setVenuesError] = useState(false)
  const [venuesLoading, setVenuesLoading] = useState(true)
  const [savedEvents, setSavedEvents] = useState([])
  const [savedEventsError, setSavedEventsError] = useState(false)
  const [savedEventsLoading, setSavedEventsLoading] = useState(true)

  useEffect(() => subscribe(() => {
    setSavedIds(getSavedIds())
    setSavedVenueIds(getSavedVenueIds())
  }), [])
  useEffect(() => subscribeAuth(() => setUser(getUser())), [])

  // The store only keeps ids, so the rows themselves still have to be fetched.
  // Only when this side is opened, and only for a signed-in user.
  const loadVenues = useCallback(() => {
    fetchAllVenues()
      .then(vs => { setVenues(vs); setVenuesError(false) })
      .catch(() => setVenuesError(true))
      .finally(() => setVenuesLoading(false))
  }, [])

  const showingVenues = view === 'venues'
  useEffect(() => { if (showingVenues && user) loadVenues() }, [showingVenues, user, loadVenues])

  // Fetched by id rather than filtered out of `events`, which only holds
  // today onwards — that is what made a saved event vanish the morning after
  // it happened while the save itself was still sitting in the database.
  const savedKey = useMemo(() => [...savedIds].sort().join(','), [savedIds])

  useEffect(() => {
    if (showingVenues || !user) return
    let cancelled = false
    fetchEventsByIds(savedIds)
      .then(list => { if (!cancelled) { setSavedEvents(list); setSavedEventsError(false) } })
      .catch(() => { if (!cancelled) setSavedEventsError(true) })
      .finally(() => { if (!cancelled) setSavedEventsLoading(false) })
    return () => { cancelled = true }
    // savedKey, not savedIds — the set is a new object on every notification.
  }, [savedKey, showingVenues, user])  // eslint-disable-line react-hooks/exhaustive-deps

  // dateKey, not date — dbEventToLocal turns `date` into a display label
  // ("Today", "Sat 9 Aug") and keeps the sortable ISO date in dateKey.
  const today = todayKey()
  const upcoming = savedEvents.filter(e => e.dateKey >= today)
  const past = savedEvents.filter(e => e.dateKey < today)
  const savedVenues = useMemo(
    () => venues
      .filter(v => savedVenueIds.has(String(v.id)))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [venues, savedVenueIds]
  )

  // Upcoming events per venue, for the count on each card.
  const eventsPerVenue = useMemo(() => {
    const counts = new Map()
    for (const e of events) if (e.venueId) counts.set(e.venueId, (counts.get(e.venueId) ?? 0) + 1)
    return counts
  }, [events])

  const count = showingVenues ? savedVenues.length : savedEvents.length

  if (!user) {
    return (
      <div className="saved-page">
        <Header />
        <ViewToggle mode={view} onChange={switchView} />
        <div className="saved-list">
          <div className="empty-state">
            <div className="empty-icon">♡</div>
            <h3>{showingVenues ? 'Save venues for later' : 'Save events for later'}</h3>
            <p>
              {showingVenues
                ? 'Sign in to keep a list of the places you want to go back to'
                : 'Sign in to keep a list of events you don’t want to miss'}
            </p>
            <button
              className="empty-signin-btn"
              onClick={() => navigate('/signin', { state: { from: goingOutPath(view, 'saved') } })}
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="saved-page">
      <Header>
        <span className="saved-count-badge">{count} saved</span>
      </Header>
      <ViewToggle mode={view} onChange={switchView} />

      {showingVenues && venuesError && (
        <ErrorBanner message="Couldn't load venues. Check your connection." onRetry={loadVenues} />
      )}
      {!showingVenues && savedEventsError && (
        <ErrorBanner
          message="Couldn't load your saved events. Check your connection."
          onRetry={() => setSavedIds(getSavedIds())}
        />
      )}

      <div className="saved-list">
        {showingVenues ? (
          venuesLoading && !venuesError ? (
            <p className="saved-status">Loading venues…</p>
          ) : savedVenues.length === 0 && !venuesError ? (
            <div className="empty-state">
              <div className="empty-icon">♡</div>
              <h3>No saved venues yet</h3>
              <p>Tap the heart on any venue to save it here</p>
            </div>
          ) : (
            <>
              <p className="saved-section-label">Your saved venues</p>
              {savedVenues.map(venue => (
                <VenueCard key={venue.id} venue={venue} eventCount={eventsPerVenue.get(venue.id) ?? 0} />
              ))}
            </>
          )
        ) : savedEventsLoading && !savedEventsError ? (
          <p className="saved-status">Loading saved events…</p>
        ) : savedEvents.length === 0 && !savedEventsError ? (
          <div className="empty-state">
            <div className="empty-icon">♡</div>
            <h3>Nothing saved yet</h3>
            <p>Tap the heart on any event to save it here</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <p className="saved-section-label">Your saved events</p>
                {upcoming.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </>
            )}
            {past.length > 0 && (
              <>
                <div className="saved-past-head">
                  <p className="saved-section-label">Been and gone</p>
                  <button
                    className="saved-clear-past"
                    onClick={() => unsaveEvents(past.map(e => e.id))}
                  >
                    Clear past
                  </button>
                </div>
                <div className="saved-past">
                  {past.map(event => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

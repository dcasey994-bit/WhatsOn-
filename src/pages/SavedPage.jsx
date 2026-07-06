import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEvents } from '../data/EventsContext.jsx'
import { getSavedIds, subscribe } from '../data/savedStore.js'
import { getUser, subscribe as subscribeAuth } from '../data/authStore.js'
import Header from '../components/Header.jsx'
import EventCard from '../components/EventCard.jsx'
import './SavedPage.css'

export default function SavedPage() {
  const events = useEvents()
  const navigate = useNavigate()
  const [savedIds, setSavedIds] = useState(() => getSavedIds())
  const [user, setUser] = useState(() => getUser())

  useEffect(() => subscribe(() => setSavedIds(getSavedIds())), [])
  useEffect(() => subscribeAuth(() => setUser(getUser())), [])

  const saved = events.filter(e => savedIds.has(String(e.id)))

  if (!user) {
    return (
      <div className="saved-page">
        <Header />
        <div className="saved-list">
          <div className="empty-state">
            <div className="empty-icon">♡</div>
            <h3>Save events for later</h3>
            <p>Sign in to keep a list of events you don&apos;t want to miss</p>
            <button
              className="empty-signin-btn"
              onClick={() => navigate('/signin', { state: { from: '/saved' } })}
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
        <span className="saved-count-badge">{saved.length} saved</span>
      </Header>

      <div className="saved-list">
        {saved.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">♡</div>
            <h3>Nothing saved yet</h3>
            <p>Tap the heart on any event to save it here</p>
          </div>
        ) : (
          <>
            <p className="saved-section-label">Your saved events</p>
            {saved.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

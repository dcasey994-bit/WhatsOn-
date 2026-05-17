import { useState, useEffect } from 'react'
import { EVENTS } from '../data/events.js'
import { getSavedIds, subscribe } from '../data/savedStore.js'
import Header from '../components/Header.jsx'
import EventCard from '../components/EventCard.jsx'
import './SavedPage.css'

export default function SavedPage() {
  const [savedIds, setSavedIds] = useState(() => getSavedIds())

  useEffect(() => subscribe(() => setSavedIds(getSavedIds())), [])

  const saved = EVENTS.filter(e => savedIds.has(e.id))

  return (
    <div className="saved-page">
      <Header title="Saved" />
      <div className="saved-list">
        {saved.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">♡</span>
            <p>Nothing saved yet</p>
            <p className="empty-sub">Tap the heart on any event to save it for later</p>
          </div>
        ) : (
          saved.map(event => <EventCard key={event.id} event={event} />)
        )}
      </div>
    </div>
  )
}

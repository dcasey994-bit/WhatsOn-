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
            <p className="saved-section-label">Your saved events tonight</p>
            {saved.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

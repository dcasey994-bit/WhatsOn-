import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isVenueSaved, toggleSavedVenue, subscribe } from '../data/savedStore.js'
import { ensureSignedIn } from '../data/authGate.js'
import './VenueSaveButton.css'

// One heart for every surface a venue appears on, so the list card, the map
// sheet and the venue page cannot drift apart on what saving looks like.
export default function VenueSaveButton({ venueId, className = '' }) {
  const navigate = useNavigate()
  const [saved, setSaved] = useState(() => isVenueSaved(venueId))

  useEffect(() => subscribe(() => setSaved(isVenueSaved(venueId))), [venueId])

  function handleClick(e) {
    // The card behind this is itself a link to the venue.
    e.stopPropagation()
    if (!ensureSignedIn(navigate)) return
    toggleSavedVenue(venueId)
  }

  return (
    <button
      className={`venue-save-btn ${saved ? 'saved' : ''} ${className}`.trim()}
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved venues' : 'Save venue'}
    >
      {saved ? '♥' : '♡'}
    </button>
  )
}

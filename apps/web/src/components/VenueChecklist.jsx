import { useState } from 'react'
import './VenueChecklist.css'

// The first thing a venue sees after registering: what is left to do before
// the listing is worth looking at. Disappears once everything is ticked, or
// when dismissed (remembered per venue on this device).

function storageKey(venueId) {
  return `whatson:checklist-dismissed:${venueId}`
}

function readDismissed(venueId) {
  try { return localStorage.getItem(storageKey(venueId)) === '1' } catch { return false }
}

export default function VenueChecklist({ venue, hasEvents, hasTeam, onAddEvent, onEditProfile, onAddTeam }) {
  const [dismissed, setDismissed] = useState(() => readDismissed(venue.id))

  const steps = [
    { key: 'venue', label: 'Add your venue', done: true },
    { key: 'event', label: 'Post your first event', done: hasEvents, action: 'Post an event', onClick: onAddEvent, primary: true },
    { key: 'profile', label: 'Add a photo and a line about you', done: Boolean(venue.cover_image_url || venue.about), action: 'Edit profile', onClick: onEditProfile },
    { key: 'team', label: 'Add your team so staff can post too', done: hasTeam, action: 'Add someone', onClick: onAddTeam },
  ]
  const left = steps.filter(s => !s.done).length

  if (dismissed || left === 0) return null

  function dismiss() {
    try { localStorage.setItem(storageKey(venue.id), '1') } catch { /* nothing to remember it in */ }
    setDismissed(true)
  }

  return (
    <section className="vcl" aria-label="Getting started">
      <div className="vcl-head">
        <h2 className="vcl-title">Get {venue.name} ready</h2>
        <span className="vcl-progress">{steps.length - left} of {steps.length} done</span>
      </div>
      <div className="vcl-bar" aria-hidden="true">
        <span style={{ width: `${((steps.length - left) / steps.length) * 100}%` }} />
      </div>
      <ol className="vcl-steps">
        {steps.map(s => (
          <li key={s.key} className={`vcl-step ${s.done ? 'is-done' : ''}`}>
            <span className="vcl-tick" aria-hidden="true">{s.done ? '✓' : ''}</span>
            <span className="vcl-label">
              {s.label}
              <span className="sr-only">{s.done ? ' (done)' : ''}</span>
            </span>
            {!s.done && s.onClick && (
              <button className={`vcl-btn ${s.primary ? 'is-primary' : ''}`} onClick={s.onClick}>{s.action}</button>
            )}
          </li>
        ))}
      </ol>
      <button className="vcl-dismiss" onClick={dismiss}>Hide this</button>
    </section>
  )
}

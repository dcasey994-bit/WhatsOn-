import { useState, useEffect } from 'react'
import { fetchMyVenue, getSubscriptionState, trialDaysLeft, startCheckout } from '../data/eventsStore.js'
import Header from '../components/Header.jsx'
import './VenueManagePage.css'

export default function VenueManagePage() {
  const [venue, setVenue] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMyVenue().then(v => { setVenue(v); setLoading(false) })
  }, [])

  if (loading) return <div className="vmp-page"><Header title="My Venue" /><p className="vmp-loading">Loading…</p></div>

  if (!venue) {
    return (
      <div className="vmp-page">
        <Header title="My Venue" />
        <div className="vmp-empty">
          <p>You haven't registered a venue yet.</p>
          <p className="vmp-empty-hint">Go to My Events to get started.</p>
        </div>
      </div>
    )
  }

  const subState = getSubscriptionState(venue)
  const daysLeft = trialDaysLeft(venue)

  const subLabel = {
    active: 'Active subscription',
    trialing: `Free trial — ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`,
    lapsed: 'Trial ended — subscribe to reactivate',
  }[subState]

  const subColor = {
    active: 'var(--accent)',
    trialing: daysLeft <= 3 ? '#ff6b6b' : '#ffc107',
    lapsed: '#ff6b6b',
  }[subState]

  return (
    <div className="vmp-page">
      <Header title="My Venue" />

      <div className="vmp-body">
        <div className="vmp-card">
          <p className="vmp-label">Venue name</p>
          <p className="vmp-value">{venue.name}</p>
        </div>

        <div className="vmp-card">
          <p className="vmp-label">Type</p>
          <p className="vmp-value">{venue.type || '—'}</p>
        </div>

        <div className="vmp-card">
          <p className="vmp-label">Address</p>
          <a
            className="vmp-value vmp-link"
            href={`https://maps.google.com/?q=${venue.lat},${venue.lng}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {venue.address}
          </a>
        </div>

        {venue.phone && (
          <div className="vmp-card">
            <p className="vmp-label">Phone</p>
            <a className="vmp-value vmp-link" href={`tel:${venue.phone}`}>{venue.phone}</a>
          </div>
        )}

        {venue.capacity && (
          <div className="vmp-card">
            <p className="vmp-label">Capacity</p>
            <p className="vmp-value">{venue.capacity.toLocaleString()}</p>
          </div>
        )}

        <div className="vmp-card vmp-sub-card">
          <p className="vmp-label">Subscription</p>
          <p className="vmp-value" style={{ color: subColor }}>{subLabel}</p>
          {subState !== 'active' && (
            <button className="vmp-subscribe-btn" onClick={() => startCheckout(venue)}>
              {subState === 'lapsed' ? 'Reactivate — £20/mo' : 'Subscribe early — £20/mo'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

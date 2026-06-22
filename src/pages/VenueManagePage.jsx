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

  if (loading) {
    return (
      <div className="venue-manage-page">
        <Header title="My Venue" />
        <p className="vm-loading">Loading…</p>
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="venue-manage-page">
        <Header title="My Venue" />
        <div className="vm-empty">
          <p>No venue registered yet.</p>
          <p className="vm-hint">Go to My Events to register your venue.</p>
        </div>
      </div>
    )
  }

  const subState = getSubscriptionState(venue)
  const daysLeft = trialDaysLeft(venue)

  return (
    <div className="venue-manage-page">
      <Header title={venue.name}>
        <span className="verified-badge">✓ Verified</span>
      </Header>

      <div className={`vm-sub-card ${subState === 'lapsed' ? 'vm-sub-lapsed' : subState === 'active' ? 'vm-sub-active' : 'vm-sub-trial'}`}>
        <div className="vm-sub-row">
          <span className="vm-sub-label">
            {subState === 'active' && '✓ Active subscription'}
            {subState === 'trialing' && `Free trial — ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
            {subState === 'lapsed' && '⚠ Trial expired'}
          </span>
          {subState !== 'active' && (
            <button className="vm-sub-btn" onClick={() => startCheckout(venue)}>
              {subState === 'lapsed' ? 'Reactivate' : 'Subscribe'} — £20/mo
            </button>
          )}
        </div>
      </div>

      <div className="vm-section">
        <h2 className="vm-section-title">Venue Details</h2>

        <div className="vm-detail-row">
          <span className="vm-detail-label">Name</span>
          <span className="vm-detail-value">{venue.name}</span>
        </div>
        <div className="vm-detail-row">
          <span className="vm-detail-label">Type</span>
          <span className="vm-detail-value">{venue.type || '—'}</span>
        </div>
        <div className="vm-detail-row">
          <span className="vm-detail-label">Address</span>
          <a
            className="vm-detail-value vm-detail-link"
            href={`https://maps.google.com/?q=${venue.lat},${venue.lng}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {venue.address}
          </a>
        </div>
        {venue.phone && (
          <div className="vm-detail-row">
            <span className="vm-detail-label">Phone</span>
            <a className="vm-detail-value vm-detail-link" href={`tel:${venue.phone}`}>{venue.phone}</a>
          </div>
        )}
        {venue.capacity && (
          <div className="vm-detail-row">
            <span className="vm-detail-label">Capacity</span>
            <span className="vm-detail-value">{venue.capacity.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  )
}

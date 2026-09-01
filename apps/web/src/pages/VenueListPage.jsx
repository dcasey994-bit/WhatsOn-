import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { venuePath, NEW_VENUE_PATH } from '../data/appMode.js'
import {
  fetchMyVenues, getSubscriptionState, trialLabel, trialDaysLeft, venueNeedsAttention,
} from '../data/eventsStore.js'
import { resolveVenueType } from '../data/venueTypes.js'
import Header from '../components/Header.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import './VenueListPage.css'

function subBadge(venue) {
  const s = getSubscriptionState(venue)
  if (s === 'active') return { label: 'Active', cls: 'vl-badge-active' }
  if (s === 'trialing') return { label: `Trial · ${trialLabel(venue)}`, cls: 'vl-badge-trial' }
  return { label: 'Archived', cls: 'vl-badge-lapsed' }
}

// One line saying what has happened and what it costs them, because the badge
// on the card says the state but not the consequence — "Archived" does not tell
// anyone their events have stopped appearing on the map.
function attentionMessage(venue) {
  if (getSubscriptionState(venue) === 'archived') {
    return `${venue.name} is archived — its events are hidden from the map.`
  }
  const days = trialDaysLeft(venue)
  const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`
  return `${venue.name}'s free trial ends ${when}.`
}

function roleBadge(venue) {
  if (venue.memberRole === 'admin') return { label: 'Admin', cls: 'vl-badge-role-admin' }
  return { label: 'Events Manager', cls: 'vl-badge-role-manager' }
}

export default function VenueListPage() {
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const navigate = useNavigate()

  function load() {
    setLoading(true)
    setError(false)
    fetchMyVenues()
      .then(vs => { setVenues(vs); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  return (
    <div className="venue-list-page">
      <Header title="My Venues" />

      {/* Outside the scrolling area, so it stays put however far down the
          list you are. Adding a venue is the reason to be on this page. */}
      {!loading && !error && venues.length > 0 && (
        <div className="vl-add-bar">
          <button className="vl-add-btn" onClick={() => navigate(NEW_VENUE_PATH)}>
            + Add another venue
          </button>
        </div>
      )}

      <div className="vl-body">
        {loading ? (
          <p className="vl-loading">Loading…</p>
        ) : error ? (
          <ErrorBanner message="Couldn't load your venues. Check your connection." onRetry={load} />
        ) : venues.length === 0 ? (
          <div className="vl-empty">
            <p>You haven&apos;t added a venue yet.</p>
            <button className="vl-add-btn" onClick={() => navigate(NEW_VENUE_PATH)}>
              + Add your first venue
            </button>
          </div>
        ) : (
          <>
            {/* Only ever shown when there is something to do about it, so it
                never becomes wallpaper. Tapping goes straight to the venue,
                where the Subscribe and Reactivate buttons live. */}
            {venues.filter(venueNeedsAttention).map(venue => (
              <button
                key={`attn-${venue.id}`}
                className={`vl-attention ${getSubscriptionState(venue) === 'archived' ? 'vl-attention-urgent' : ''}`}
                onClick={() => navigate(venuePath(venue.id))}
              >
                <span className="vl-attention-text">{attentionMessage(venue)}</span>
                <span className="vl-attention-cta">Fix ›</span>
              </button>
            ))}

            {venues.map(venue => {
              const sub = subBadge(venue)
              const role = roleBadge(venue)
              return (
                <button
                  key={venue.id}
                  className="vl-card"
                  onClick={() => navigate(venuePath(venue.id))}
                >
                  <div className="vl-card-main">
                    <p className="vl-card-name">{venue.name}</p>
                    <p className="vl-card-type">{resolveVenueType(venue.type) || 'Venue'}</p>
                    <p className="vl-card-addr">{venue.address}</p>
                  </div>
                  <div className="vl-card-side">
                    <span className={`vl-badge ${role.cls}`}>{role.label}</span>
                    {venue.memberRole === 'admin' && (
                      <span className={`vl-badge ${sub.cls}`}>{sub.label}</span>
                    )}
                    <span className="vl-chevron">›</span>
                  </div>
                </button>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

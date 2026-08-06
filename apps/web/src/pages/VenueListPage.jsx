import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMyVenues, getSubscriptionState, trialDaysLeft } from '../data/eventsStore.js'
import { resolveVenueType } from '../data/venueTypes.js'
import Header from '../components/Header.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import './VenueListPage.css'

function subBadge(venue) {
  const s = getSubscriptionState(venue)
  if (s === 'active') return { label: 'Active', cls: 'vl-badge-active' }
  if (s === 'trialing') return { label: `Trial · ${trialDaysLeft(venue)}d`, cls: 'vl-badge-trial' }
  return { label: 'Archived', cls: 'vl-badge-lapsed' }
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

      <div className="vl-body">
        {loading ? (
          <p className="vl-loading">Loading…</p>
        ) : error ? (
          <ErrorBanner message="Couldn't load your venues. Check your connection." onRetry={load} />
        ) : venues.length === 0 ? (
          <div className="vl-empty">
            <p>You haven&apos;t added a venue yet.</p>
            <button className="vl-add-btn" onClick={() => navigate('/manage/new')}>
              + Add your first venue
            </button>
          </div>
        ) : (
          <>
            {venues.map(venue => {
              const sub = subBadge(venue)
              const role = roleBadge(venue)
              return (
                <button
                  key={venue.id}
                  className="vl-card"
                  onClick={() => navigate(`/manage/${venue.id}`)}
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
            <button className="vl-add-btn" onClick={() => navigate('/manage/new')}>
              + Add another venue
            </button>
          </>
        )}
      </div>
    </div>
  )
}

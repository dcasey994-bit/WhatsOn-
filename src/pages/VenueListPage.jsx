import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMyVenues, getSubscriptionState, trialDaysLeft } from '../data/eventsStore.js'
import Header from '../components/Header.jsx'
import './VenueListPage.css'

function subBadge(venue) {
  const s = getSubscriptionState(venue)
  if (s === 'active') return { label: 'Active', cls: 'vl-badge-active' }
  if (s === 'trialing') return { label: `Trial · ${trialDaysLeft(venue)}d`, cls: 'vl-badge-trial' }
  return { label: 'Archived', cls: 'vl-badge-lapsed' }
}

function roleBadge(venue) {
  if (venue.memberRole === 'admin') return { label: 'Admin', cls: 'vl-badge-role-admin' }
  return { label: 'Manager', cls: 'vl-badge-role-manager' }
}

export default function VenueListPage() {
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchMyVenues().then(vs => { setVenues(vs); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="venue-list-page">
      <Header title="My Venues" />

      <div className="vl-body">
        {loading ? (
          <p className="vl-loading">Loading…</p>
        ) : venues.length === 0 ? (
          <div className="vl-empty">
            <p>You haven&apos;t added a venue yet.</p>
            <button className="vl-add-btn" onClick={() => navigate('/venue/new')}>
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
                  onClick={() => navigate(`/venue/manage/${venue.id}`)}
                >
                  <div className="vl-card-main">
                    <p className="vl-card-name">{venue.name}</p>
                    <p className="vl-card-type">{venue.type || 'Venue'}</p>
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
            <button className="vl-add-btn" onClick={() => navigate('/venue/new')}>
              + Add another venue
            </button>
          </>
        )}
      </div>
    </div>
  )
}

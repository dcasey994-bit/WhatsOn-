import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { getUser, setPreferredMode, signOut, subscribe } from '../data/authStore.js'
import { useAppMode, homePathFor } from '../data/appMode.js'
import { fetchMyVenues, getSubscriptionState } from '../data/eventsStore.js'
import './Header.css'

export default function Header({ title, children }) {
  const [user, setUser] = useState(() => getUser())
  const [venues, setVenues] = useState([])
  const [menu, setMenu] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const avatarRef = useRef(null)
  const navigate = useNavigate()
  // Where the user actually is, per the URL — not a stored flag that can
  // fall out of step with the page on screen.
  const mode = useAppMode()

  useEffect(() => subscribe(() => setUser(getUser())), [])

  // Load venues so the account menu can flag any needing a subscription
  useEffect(() => {
    if (!user) { setVenues([]); return }
    fetchMyVenues().then(setVenues).catch(() => setVenues([]))
  }, [user?.id])

  const needsAttention = venues.some(v => getSubscriptionState(v) !== 'active')

  function openMenu() {
    if (avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect()
      setMenuPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
    setMenu(true)
  }

  function switchMode(next) {
    // Remembered only so the next sign-in lands in the right place; the mode
    // shown in the UI always comes from the route.
    setPreferredMode(next)
    setMenu(false)
    navigate(homePathFor(next), { replace: true })
  }

  return (
    <header className="app-header">
      <div className="header-brand">
        <span className="brand-name">WhatsOn<span className="brand-q">?</span></span>
        {title && <span className="header-title">{title}</span>}
      </div>

      <div className="header-actions">
        {children}
        {user ? (
          <div className="avatar-wrap">
            <button ref={avatarRef} className="avatar-btn" onClick={openMenu}>
              {user.avatar}
            </button>
          </div>
        ) : (
          <button
            className="header-signin-btn"
            onClick={() => navigate('/signin', { state: { from: window.location.pathname } })}
          >
            Sign in
          </button>
        )}
      </div>

      {menu && user && createPortal(
        <>
          <div className="avatar-backdrop" onClick={() => setMenu(false)} />
          <div className="avatar-menu" style={{ top: menuPos.top, right: menuPos.right }}>
            <p className="avatar-name">{user.name}</p>
            <p className="avatar-email">{user.email}</p>

            <hr className="avatar-divider" />

            <p className="mode-label">Mode</p>
            <div className="mode-toggle">
              <button
                className={`mode-btn ${mode !== 'venue' ? 'active' : ''}`}
                onClick={() => switchMode('customer')}
              >
                🗺️ Going out
              </button>
              <button
                className={`mode-btn ${mode === 'venue' ? 'active' : ''}`}
                onClick={() => switchMode('venue')}
              >
                🏠 My venue
              </button>
            </div>

            <hr className="avatar-divider" />

            <button className="settings-link-btn" onClick={() => { setMenu(false); navigate('/settings') }}>
              Account settings →
            </button>

            <hr className="avatar-divider" />

            {needsAttention && (
              <button className="upgrade-btn" onClick={() => switchMode('venue')}>
                Manage subscriptions
              </button>
            )}

            <button className="signout-btn" onClick={() => { signOut(); setMenu(false) }}>
              Sign out
            </button>
          </div>
        </>,
        document.body
      )}
    </header>
  )
}

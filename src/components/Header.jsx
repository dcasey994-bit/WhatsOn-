import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { getUser, setRole, signOut, subscribe } from '../data/authStore.js'
import { fetchMyVenue, getSubscriptionState, startCheckout } from '../data/eventsStore.js'
import './Header.css'

export default function Header({ title, children }) {
  const [user, setUser] = useState(() => getUser())
  const [venue, setVenue] = useState(null)
  const [menu, setMenu] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const avatarRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => subscribe(() => setUser(getUser())), [])

  // Load the venue (if any) so the account menu can offer an upgrade
  useEffect(() => {
    if (!user) { setVenue(null); return }
    fetchMyVenue().then(setVenue)
  }, [user?.id])

  const subState = getSubscriptionState(venue)
  const canUpgrade = venue && subState !== 'active'

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

  function handleRoleToggle(role) {
    setRole(role)
    setMenu(false)
    navigate(role === 'venue' ? '/venue' : '/discover', { replace: true })
  }

  return (
    <header className="app-header">
      <div className="header-brand">
        <span className="brand-name">WhatsOn<span className="brand-q">?</span></span>
        {title && <span className="header-title">{title}</span>}
      </div>

      <div className="header-actions">
        {children}
        {user && (
          <div className="avatar-wrap">
            <button ref={avatarRef} className="avatar-btn" onClick={openMenu}>
              {user.avatar}
            </button>
          </div>
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
                className={`mode-btn ${user.role !== 'venue' ? 'active' : ''}`}
                onClick={() => handleRoleToggle('customer')}
              >
                🗺️ Going out
              </button>
              <button
                className={`mode-btn ${user.role === 'venue' ? 'active' : ''}`}
                onClick={() => handleRoleToggle('venue')}
              >
                🏠 My venue
              </button>
            </div>

            <hr className="avatar-divider" />

            {canUpgrade && (
              <button className="upgrade-btn" onClick={() => { setMenu(false); startCheckout(venue) }}>
                {subState === 'lapsed' ? 'Reactivate — £20/mo' : 'Upgrade to Pro — £20/mo'}
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

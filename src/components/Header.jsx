import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, setRole, signOut, subscribe } from '../data/authStore.js'
import './Header.css'

export default function Header({ title, children }) {
  const [user, setUser] = useState(() => getUser())
  const [menu, setMenu] = useState(false)
  const navigate = useNavigate()

  useEffect(() => subscribe(() => setUser(getUser())), [])

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
            <button className="avatar-btn" onClick={() => setMenu(m => !m)}>
              {user.avatar}
            </button>
            {menu && (
              <>
                <div className="avatar-backdrop" onClick={() => setMenu(false)} />
                <div className="avatar-menu">
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

                  <button className="signout-btn" onClick={() => { signOut(); setMenu(false) }}>
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

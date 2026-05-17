import { useState } from 'react'
import { getUser, signOut } from '../data/authStore.js'
import './Header.css'

export default function Header({ title, children }) {
  const user = getUser()
  const [menu, setMenu] = useState(false)

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
              <div className="avatar-menu">
                <p className="avatar-name">{user.name}</p>
                <p className="avatar-email">{user.email}</p>
                <hr className="avatar-divider" />
                <button className="signout-btn" onClick={() => { signOut(); setMenu(false) }}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

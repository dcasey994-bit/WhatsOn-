import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, getPreferredMode, setPreferredMode, signOut } from '../data/authStore.js'
import { getTheme, setTheme } from '../data/themeStore.js'
import Header from '../components/Header.jsx'
import './AccountSettingsPage.css'

export default function AccountSettingsPage() {
  const navigate = useNavigate()
  const user = getUser()
  const [theme, setThemeState] = useState(() => getTheme())
  const [mode, setModeState] = useState(() => getPreferredMode())

  function handleTheme(t) {
    setTheme(t)
    setThemeState(t)
  }

  function handleMode(m) {
    setPreferredMode(m)
    setModeState(m)
  }

  function handleSignOut() {
    signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="settings-page">
      <Header title="Account Settings" />

      <div className="settings-body">

        {/* Profile */}
        <section className="settings-section">
          <h2 className="settings-section-title">Profile</h2>
          <div className="settings-row">
            <span className="settings-label">Name</span>
            <span className="settings-value">{user?.name || '—'}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Email</span>
            <span className="settings-value">{user?.email || '—'}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Sign-in method</span>
            <span className="settings-value settings-value-cap">{user?.provider || 'email'}</span>
          </div>
        </section>

        {/* Appearance */}
        <section className="settings-section">
          <h2 className="settings-section-title">Appearance</h2>
          <p className="settings-hint">Choose your preferred colour scheme. Auto follows your device setting.</p>
          <div className="settings-toggle-row">
            <button
              className={`settings-toggle-btn ${theme === 'system' ? 'active' : ''}`}
              onClick={() => handleTheme('system')}
            >
              🌐 Auto
            </button>
            <button
              className={`settings-toggle-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => handleTheme('light')}
            >
              ☀️ Light
            </button>
            <button
              className={`settings-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => handleTheme('dark')}
            >
              🌙 Dark
            </button>
          </div>
        </section>

        {/* Mode */}
        <section className="settings-section">
          <h2 className="settings-section-title">Default mode</h2>
          <p className="settings-hint">Which mode you land in when you open the app.</p>
          <div className="settings-toggle-row">
            <button
              className={`settings-toggle-btn ${mode === 'customer' ? 'active' : ''}`}
              onClick={() => handleMode('customer')}
            >
              🗺️ Going Out
            </button>
            <button
              className={`settings-toggle-btn ${mode === 'venue' ? 'active' : ''}`}
              onClick={() => handleMode('venue')}
            >
              🏠 My Venue
            </button>
          </div>
        </section>

        {/* About */}
        <section className="settings-section">
          <h2 className="settings-section-title">About</h2>
          <button className="settings-link-row" onClick={() => navigate('/privacy')}>
            <span>Privacy Policy</span><span className="settings-chevron">›</span>
          </button>
          <button className="settings-link-row" onClick={() => navigate('/terms')}>
            <span>Terms of Service</span><span className="settings-chevron">›</span>
          </button>
        </section>

        {/* Actions */}
        <section className="settings-section">
          <button className="settings-signout-btn" onClick={handleSignOut}>
            Sign out
          </button>
        </section>

      </div>
    </div>
  )
}

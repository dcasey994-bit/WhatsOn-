import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, getPreferredMode, setPreferredMode, signOut, deleteAccount } from '../data/authStore.js'
import { clearLocalSaves } from '../data/savedStore.js'
import { getTheme, setTheme } from '../data/themeStore.js'
import Header from '../components/Header.jsx'
import './AccountSettingsPage.css'

export default function AccountSettingsPage() {
  const navigate = useNavigate()
  const user = getUser()
  const [theme, setThemeState] = useState(() => getTheme())
  const [mode, setModeState] = useState(() => getPreferredMode())
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

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

  function cancelDelete() {
    setConfirming(false)
    setTyped('')
    setDeleteError(null)
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteAccount()
      clearLocalSaves()
      // Losing the session unmounts this page via authed(), which redirects to
      // /signin on its own. This is only the fallback for the case where it
      // does not; the confirmation travels via authStore either way.
      navigate('/signin', { replace: true })
    } catch (err) {
      // Staying on the page with the reason visible beats a silent no-op —
      // otherwise it looks like the account was deleted when it was not.
      setDeleteError(err.message || 'Could not delete the account. Please try again.')
      setDeleting(false)
    }
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

        {/* Danger zone — Google Play requires account deletion to be reachable
            from inside the app, not only by emailing us. */}
        <section className="settings-section settings-danger">
          <h2 className="settings-section-title">Delete account</h2>

          {!confirming ? (
            <>
              <p className="settings-hint">
                Permanently deletes your account and everything saved to it. This
                cannot be undone.
              </p>
              <button className="settings-delete-btn" onClick={() => setConfirming(true)}>
                Delete my account
              </button>
            </>
          ) : (
            <>
              <p className="settings-hint">This will permanently remove:</p>
              <ul className="settings-danger-list">
                <li>Your account and sign-in details</li>
                <li>Your saved events, saved venues, and anything you are going to</li>
                <li>Any venue you are the last admin of, along with its events</li>
              </ul>
              <p className="settings-hint">
                A venue with another admin is handed over to them rather than
                deleted. If a venue of yours has a paid subscription, cancel it
                first — deleting your account here does not stop the billing.
              </p>

              <label className="settings-confirm-label">
                Type <strong>DELETE</strong> to confirm
                <input
                  className="settings-confirm-input"
                  value={typed}
                  onChange={e => setTyped(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="characters"
                  placeholder="DELETE"
                />
              </label>

              {deleteError && <p className="settings-error">{deleteError}</p>}

              <div className="settings-danger-actions">
                <button className="settings-cancel-btn" onClick={cancelDelete} disabled={deleting}>
                  Cancel
                </button>
                <button
                  className="settings-delete-btn"
                  onClick={handleDelete}
                  disabled={typed !== 'DELETE' || deleting}
                >
                  {deleting ? 'Deleting…' : 'Delete for ever'}
                </button>
              </div>
            </>
          )}
        </section>

      </div>
    </div>
  )
}

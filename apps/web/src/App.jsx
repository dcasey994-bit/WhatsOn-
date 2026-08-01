import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { getUser, initAuth, initNativeAuthBridge } from './data/authStore.js'
import { loadSavedFromDB } from './data/savedStore.js'
import { loadGoingCounts } from './data/goingStore.js'
import { EventsProvider } from './data/EventsContext.jsx'
import SignInPage from './pages/SignInPage.jsx'
import DiscoverPage from './pages/DiscoverPage.jsx'
import BrowsePage from './pages/BrowsePage.jsx'
import SavedPage from './pages/SavedPage.jsx'
import VenueListPage from './pages/VenueListPage.jsx'
import VenueRegisterPage from './pages/VenueRegisterPage.jsx'
import VenueEventsPage from './pages/VenueEventsPage.jsx'
import VenueProfilePage from './pages/VenueProfilePage.jsx'
import VenueManagePage from './pages/VenueManagePage.jsx'
import EventDetailPage from './pages/EventDetailPage.jsx'
import AccountSettingsPage from './pages/AccountSettingsPage.jsx'
import PrivacyPage from './pages/PrivacyPage.jsx'
import TermsPage from './pages/TermsPage.jsx'
import BottomNav from './components/BottomNav.jsx'

// After signing in, return to wherever the user was when they hit the gate
function SignInRoute({ user }) {
  const location = useLocation()
  if (user) return <Navigate to={location.state?.from || '/discover'} replace />
  return <SignInPage />
}

export default function App() {
  const [user, setUser] = useState(() => getUser())
  const [ready, setReady] = useState(false)
  const location = useLocation()

  useEffect(() => {
    return initAuth(u => {
      setUser(u)
      setReady(true)
      loadGoingCounts()          // public counts — no account needed
      if (u) loadSavedFromDB()   // personal saves need one
    })
  }, [])

  // Native only: catches the deep link Google sends us back on after OAuth.
  useEffect(() => {
    let cleanup
    initNativeAuthBridge(err => {
      console.error('Native sign-in failed:', err)
    }).then(fn => { cleanup = fn })
    return () => cleanup?.()
  }, [])

  if (!ready) return <div className="app-loading" />

  const authed = el => (user ? el : <Navigate to="/signin" replace />)

  return (
    <EventsProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/discover" replace />} />
        <Route path="/signin" element={<SignInRoute user={user} />} />

        {/* Public — browse without an account */}
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/event/:id" element={<EventDetailPage />} />
        <Route path="/venue/:id" element={<VenueProfilePage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        {/* Account required */}
        <Route path="/settings" element={authed(<AccountSettingsPage />)} />
        <Route path="/venue" element={authed(<VenueListPage />)} />
        <Route path="/venue/new" element={authed(<VenueRegisterPage />)} />
        <Route path="/venue/events/upcoming" element={authed(<VenueEventsPage period="upcoming" />)} />
        <Route path="/venue/events/past" element={authed(<VenueEventsPage period="past" />)} />
        <Route path="/venue/manage/:id" element={authed(<VenueManagePage />)} />

        <Route path="*" element={<Navigate to="/discover" replace />} />
      </Routes>
      {location.pathname !== '/signin' && <BottomNav />}
    </EventsProvider>
  )
}

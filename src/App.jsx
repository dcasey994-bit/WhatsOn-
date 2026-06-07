import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { getUser, initAuth } from './data/authStore.js'
import { loadSavedFromDB } from './data/savedStore.js'
import SignInPage from './pages/SignInPage.jsx'
import DiscoverPage from './pages/DiscoverPage.jsx'
import BrowsePage from './pages/BrowsePage.jsx'
import SavedPage from './pages/SavedPage.jsx'
import VenuePage from './pages/VenuePage.jsx'
import EventDetailPage from './pages/EventDetailPage.jsx'
import BottomNav from './components/BottomNav.jsx'

export default function App() {
  const [user, setUser] = useState(() => getUser())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    return initAuth(u => {
      setUser(u)
      setReady(true)
      if (u) loadSavedFromDB()
    })
  }, [])

  if (!ready) return <div className="app-loading" />

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<SignInPage />} />
      </Routes>
    )
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/discover" replace />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/venue" element={<VenuePage />} />
        <Route path="/event/:id" element={<EventDetailPage />} />
        <Route path="*" element={<Navigate to="/discover" replace />} />
      </Routes>
      <BottomNav />
    </>
  )
}

import { Routes, Route, Navigate } from 'react-router-dom'
import DiscoverPage from './pages/DiscoverPage.jsx'
import BrowsePage from './pages/BrowsePage.jsx'
import SavedPage from './pages/SavedPage.jsx'
import VenuePage from './pages/VenuePage.jsx'
import EventDetailPage from './pages/EventDetailPage.jsx'
import BottomNav from './components/BottomNav.jsx'

export default function App() {
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

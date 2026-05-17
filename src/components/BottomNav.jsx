import { NavLink } from 'react-router-dom'
import './BottomNav.css'

const tabs = [
  { to: '/discover', label: 'Discover', icon: '🗺️' },
  { to: '/browse', label: 'Browse', icon: '🎟️' },
  { to: '/saved', label: 'Saved', icon: '♥' },
  { to: '/venue', label: 'Venues', icon: '🏠' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {tabs.map(({ to, label, icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'nav-tab active' : 'nav-tab'}>
          <span className="nav-icon">{icon}</span>
          <span className="nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

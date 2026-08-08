import { NavLink } from 'react-router-dom'
import { useAppMode, useView, goingOutPath } from '../data/appMode.js'
import './BottomNav.css'

function IconMap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/>
      <line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  )
}

function IconList() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )
}

function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18"/>
      <path d="M9 21V9"/>
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <polyline points="12 7 12 12 15 14"/>
    </svg>
  )
}

// Paths are built from the view the user is currently on, so changing tab
// keeps you looking at the same thing — switch to venues on the map and Browse
// opens the venue list, not the event one.
const goingOutTabs = [
  { page: 'discover', label: 'Discover', Icon: IconMap },
  { page: 'browse',   label: 'Browse',   Icon: IconList },
  { page: 'saved',    label: 'Saved',    Icon: IconHeart },
]

const venueTabs = [
  { to: '/manage',                 label: 'My Venues', Icon: IconBuilding },
  { to: '/manage/events/upcoming', label: 'Upcoming',  Icon: IconCalendar },
  { to: '/manage/events/past',     label: 'Past',      Icon: IconClock },
]

export default function BottomNav() {
  // Derived from the URL, so the tabs cannot disagree with the page on screen
  // — including after a browser or device back.
  const view = useView()
  const tabs = useAppMode() === 'venue'
    ? venueTabs
    : goingOutTabs.map(t => ({ ...t, to: goingOutPath(view, t.page) }))

  return (
    <nav className="bottom-nav">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) => isActive ? 'nav-tab active' : 'nav-tab'}
        >
          <Icon />
          <span className="nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

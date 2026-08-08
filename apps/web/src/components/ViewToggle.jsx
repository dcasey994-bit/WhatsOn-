import './ViewToggle.css'

// Events / Venues switch. Discover puts it above the map, Browse above the
// list; both are showing the same two things, so it is one component rather
// than two that have to be kept looking alike.
export default function ViewToggle({ mode, onChange }) {
  return (
    <div className="view-toggle-bar">
      <button
        className={`vtoggle-btn ${mode === 'events' ? 'active' : ''}`}
        onClick={() => onChange('events')}
      >
        <span>📅</span> Events
      </button>
      <button
        className={`vtoggle-btn ${mode === 'venues' ? 'active' : ''}`}
        onClick={() => onChange('venues')}
      >
        <span>🏠</span> Venues
      </button>
    </div>
  )
}

import { VENUE_TYPE_COLORS } from '../data/venueTypes.js'
// Same bar as the event categories — one row of chips filtering the map below.
import './CategoryFilter.css'

const ALL_COLOR = '#00ff88'
const ALL_BG = 'rgba(0,255,136,0.12)'

// `types` is only the types the loaded venues actually use, not the full list.
// Offering all seven would mean six dead chips while pubs are the only thing
// being listed, each one emptying the map when tapped.
export default function VenueTypeFilter({ types, active, onChange }) {
  if (types.length < 2) return null   // nothing to choose between

  return (
    <div className="filter-bar">
      <button
        className={`filter-chip ${active === 'all' ? 'active' : ''}`}
        style={active === 'all' ? { background: ALL_BG, color: ALL_COLOR, borderColor: ALL_COLOR } : {}}
        onClick={() => onChange('all')}
      >
        All
      </button>
      {types.map(type => {
        const color = VENUE_TYPE_COLORS[type]
        return (
          <button
            key={type}
            className={`filter-chip ${active === type ? 'active' : ''}`}
            style={active === type ? { background: `${color}22`, color, borderColor: color } : {}}
            onClick={() => onChange(type)}
          >
            {type}
          </button>
        )
      })}
    </div>
  )
}

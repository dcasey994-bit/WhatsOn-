import { CATEGORIES } from '../data/events.js'
import './CategoryFilter.css'

const ALL = { label: 'All', color: '#00ff88', bg: 'rgba(0,255,136,0.12)' }

export default function CategoryFilter({ active, onChange }) {
  const items = [['all', ALL], ...Object.entries(CATEGORIES)]

  return (
    <div className="filter-bar">
      {items.map(([key, cat]) => (
        <button
          key={key}
          className={`filter-chip ${active === key ? 'active' : ''}`}
          style={active === key ? { background: cat.bg, color: cat.color, borderColor: cat.color } : {}}
          onClick={() => onChange(key)}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}

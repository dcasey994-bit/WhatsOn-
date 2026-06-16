import { DATE_FILTERS } from '../data/dateFilter.js'
import './DateFilter.css'

export default function DateFilter({ active, onChange }) {
  return (
    <div className="date-filter">
      {DATE_FILTERS.map(({ key, label }) => (
        <button
          key={key}
          className={`date-chip ${active === key ? 'active' : ''}`}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

import { buildDayOptions } from '../data/dateFilter.js'
import './DayStrip.css'

export default function DayStrip({ active, onChange }) {
  const days = buildDayOptions(7)

  return (
    <div className="day-strip">
      {days.map(({ key, top, bottom }) => (
        <button
          key={key}
          className={`day-chip ${active === key ? 'active' : ''}`}
          onClick={() => onChange(key)}
        >
          <span className="day-top">{top}</span>
          <span className="day-bottom">{bottom}</span>
        </button>
      ))}
    </div>
  )
}

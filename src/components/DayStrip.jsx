import { buildDayOptions } from '../data/dateFilter.js'
import './DayStrip.css'

export default function DayStrip({ active, onChange }) {
  const days = buildDayOptions(7)

  return (
    <div className="day-strip">
      {days.map(({ key, top, bottom }) => (
        <button
          key={key}
          className={`day-chip ${active === key ? 'active' : ''} ${bottom ? '' : 'day-chip-all'}`}
          onClick={() => onChange(key)}
        >
          <span className="day-top">{top}</span>
          {bottom && <span className="day-bottom">{bottom}</span>}
        </button>
      ))}
    </div>
  )
}

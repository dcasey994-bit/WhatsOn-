// Local YYYY-MM-DD (avoids UTC off-by-one near midnight)
function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayKey() {
  return fmt(new Date())
}

// Build the day options for the horizontal strip: the next `days` days
export function buildDayOptions(days = 14) {
  const opts = []
  const now = new Date()
  for (let i = 0; i < days; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    opts.push({
      key: fmt(d),
      top: i === 0 ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' }),
      bottom: String(d.getDate()),
    })
  }
  return opts
}

// Match an event against the selected day ('all' or a YYYY-MM-DD key)
export function matchesDay(event, day) {
  if (day === 'all') return true
  const key = event.dateKey || todayKey() // mock events have no dateKey → treat as today
  return key === day
}

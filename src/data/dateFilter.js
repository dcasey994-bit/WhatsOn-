// Local YYYY-MM-DD (avoids UTC off-by-one near midnight)
function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayKey() {
  return fmt(new Date())
}

// The Saturday + Sunday of the current/upcoming weekend
export function weekendKeys() {
  const now = new Date()
  const day = now.getDay() // 0 = Sun ... 6 = Sat
  const sat = new Date(now)
  if (day === 0) sat.setDate(now.getDate() - 1) // Sunday → yesterday was Saturday
  else sat.setDate(now.getDate() + (6 - day))
  const sun = new Date(sat)
  sun.setDate(sat.getDate() + 1)
  return new Set([fmt(sat), fmt(sun)])
}

export function matchesDate(event, filter) {
  if (filter === 'all') return true
  const key = event.dateKey || todayKey() // mock events have no dateKey → treat as tonight
  if (filter === 'tonight') return key === todayKey()
  if (filter === 'weekend') return weekendKeys().has(key)
  return true
}

export const DATE_FILTERS = [
  { key: 'tonight', label: 'Tonight' },
  { key: 'weekend', label: 'This Weekend' },
  { key: 'all', label: 'All Upcoming' },
]

// Dates for a repeating event.
//
// Dates are 'YYYY-MM-DD' strings throughout, as the events table stores them,
// and the arithmetic is done in UTC so a clocks-change weekend cannot shift a
// date by one.

export const REPEAT_OPTIONS = ['none', 'weekly', 'fortnightly', 'monthly']

// A year of weekly events is plenty, and keeps one form from posting hundreds.
export const MAX_OCCURRENCES = 52

const ORDINALS = ['1st', '2nd', '3rd', '4th']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function parse(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function format(date) {
  return date.toISOString().slice(0, 10)
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

// Which weekday of the month the start date is. The 29th–31st are "last",
// because a pub's "5th Friday" quiz is really its last-Friday quiz, and most
// months have no fifth one.
function monthlyRule(start) {
  const nth = Math.ceil(start.getUTCDate() / 7)
  return { weekday: start.getUTCDay(), nth: nth >= 5 ? 'last' : nth }
}

function nthWeekdayOf(year, month, weekday, nth) {
  if (nth === 'last') {
    const last = new Date(Date.UTC(year, month, daysInMonth(year, month)))
    last.setUTCDate(last.getUTCDate() - ((last.getUTCDay() - weekday + 7) % 7))
    return last
  }
  const first = new Date(Date.UTC(year, month, 1))
  first.setUTCDate(1 + ((weekday - first.getUTCDay() + 7) % 7) + (nth - 1) * 7)
  return first
}

// "Every Tuesday", "Every other Tuesday", "Monthly, 2nd Tuesday".
export function describeRepeat(repeat, startIso) {
  if (!startIso || repeat === 'none') return ''
  const start = parse(startIso)
  const day = WEEKDAYS[start.getUTCDay()]
  if (repeat === 'weekly') return `Every ${day}`
  if (repeat === 'fortnightly') return `Every other ${day}`
  const { nth } = monthlyRule(start)
  return `Monthly, ${nth === 'last' ? 'last' : ORDINALS[nth - 1]} ${day}`
}

// Every date from start to until inclusive, start first. Just [start] when
// not repeating.
export function repeatDates(repeat, startIso, untilIso) {
  if (!startIso) return []
  if (repeat === 'none' || !untilIso || untilIso < startIso) return [startIso]

  const start = parse(startIso)
  const out = []

  if (repeat === 'weekly' || repeat === 'fortnightly') {
    const step = repeat === 'weekly' ? 7 : 14
    for (let d = new Date(start); format(d) <= untilIso && out.length < MAX_OCCURRENCES; d.setUTCDate(d.getUTCDate() + step)) {
      out.push(format(d))
    }
    return out
  }

  const { weekday, nth } = monthlyRule(start)
  for (let i = 0; out.length < MAX_OCCURRENCES; i++) {
    const y = start.getUTCFullYear() + Math.floor((start.getUTCMonth() + i) / 12)
    const m = (start.getUTCMonth() + i) % 12
    const iso = format(nthWeekdayOf(y, m, weekday, nth))
    if (iso > untilIso) break
    if (iso >= startIso) out.push(iso)
  }
  return out
}

// A sensible "until" to start from: three months on.
export function defaultUntil(startIso) {
  if (!startIso) return ''
  const d = parse(startIso)
  d.setUTCMonth(d.getUTCMonth() + 3)
  return format(d)
}

// The furthest "until" the form allows: a year on.
export function maxUntil(startIso) {
  if (!startIso) return ''
  const d = parse(startIso)
  d.setUTCFullYear(d.getUTCFullYear() + 1)
  return format(d)
}

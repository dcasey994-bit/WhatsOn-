// How an event's time reads wherever it is shown.
//
// An end earlier than the start means the night runs past midnight — a club
// night at 22:00–03:00 — rather than a mistake. There is no separate end date
// to check against, so this convention is the whole of it, and keeping it in
// one function stops each surface inventing its own answer.

export function endsNextDay(start, end) {
  return Boolean(start && end && end < start)
}

// "19:30", "19:30 – 23:00", or "22:00 – 03:00" for one that runs over.
export function formatTimeRange(start, end) {
  if (!start) return ''
  if (!end) return start
  return `${start} – ${end}`
}

export const CATEGORIES = {
  music:   { label: 'Live Music',    color: '#00c853', bg: '#00c85322' },
  comedy:  { label: 'Entertainment', color: '#ffab00', bg: '#ffab0022' },
  quiz:    { label: 'Quiz Night',    color: '#2979ff', bg: '#2979ff22' },
  sports:  { label: 'Live Sports',   color: '#ff4081', bg: '#ff408122' },
}

// Categories we no longer offer, mapped to the one that replaced them.
// Rows created before a category was retired keep their old value, so this
// keeps them displaying sensibly rather than falling back to Live Music.
const RETIRED = {
  karaoke: 'comedy',   // folded into Entertainment
  theatre: 'comedy',
  jazz:    'music',
}

// Always returns a usable category, so components can read cat.color /
// cat.bg / cat.label without guarding.
export function getCategory(key) {
  return CATEGORIES[key] || CATEGORIES[RETIRED[key]] || CATEGORIES.music
}

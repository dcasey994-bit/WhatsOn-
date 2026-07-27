export const CATEGORIES = {
  music:   { label: 'Live Music',   color: '#00c853', bg: '#00c85322' },
  comedy:  { label: 'Entertainment', color: '#ffab00', bg: '#ffab0022' },
  karaoke: { label: 'Karaoke',      color: '#aa00ff', bg: '#aa00ff22' },
  quiz:    { label: 'Quiz Night',   color: '#ff4081', bg: '#ff408122' },
  sports:  { label: 'Live Sports',  color: '#2979ff', bg: '#2979ff22' },
}

// Always returns a usable category. Events created before a category was
// retired (e.g. the old 'jazz' and 'theatre') would otherwise be undefined
// here and crash any component that reads cat.color / cat.bg / cat.label.
export function getCategory(key) {
  return CATEGORIES[key] || CATEGORIES.music
}

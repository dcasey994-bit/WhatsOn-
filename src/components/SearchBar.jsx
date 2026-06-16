import './SearchBar.css'

export default function SearchBar({ value, onChange, placeholder = 'Search events or venues…' }) {
  return (
    <div className="search-bar">
      <span className="search-icon">🔍</span>
      <input
        type="search"
        className="search-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button className="search-clear" onClick={() => onChange('')} aria-label="Clear search">
          ✕
        </button>
      )}
    </div>
  )
}

// Match an event against a free-text query (name, venue, category label)
export function matchesQuery(event, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    event.name?.toLowerCase().includes(q) ||
    event.venue?.toLowerCase().includes(q) ||
    event.category?.toLowerCase().includes(q)
  )
}

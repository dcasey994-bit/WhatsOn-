const KEY = 'whatson_theme'

let listeners = []
function notify() { listeners.forEach(fn => fn()) }

const media = window.matchMedia('(prefers-color-scheme: light)')
media.addEventListener('change', () => notify())

export function initTheme() {
  const saved = localStorage.getItem(KEY)
  if (saved === 'light' || saved === 'dark') {
    document.documentElement.dataset.theme = saved
  }
}

export function getTheme() {
  return localStorage.getItem(KEY) || 'system'
}

// The theme actually in effect right now: 'light' | 'dark'
export function getResolvedTheme() {
  const saved = localStorage.getItem(KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return media.matches ? 'light' : 'dark'
}

export function setTheme(theme) {
  if (theme === 'system') {
    localStorage.removeItem(KEY)
    delete document.documentElement.dataset.theme
  } else {
    localStorage.setItem(KEY, theme)
    document.documentElement.dataset.theme = theme
  }
  notify()
}

export function subscribeTheme(fn) {
  listeners.push(fn)
  return () => { listeners = listeners.filter(l => l !== fn) }
}

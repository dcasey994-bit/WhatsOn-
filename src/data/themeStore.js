const KEY = 'whatson_theme'

export function initTheme() {
  const saved = localStorage.getItem(KEY)
  if (saved === 'light' || saved === 'dark') {
    document.documentElement.dataset.theme = saved
  }
}

export function getTheme() {
  return localStorage.getItem(KEY) || 'system'
}

export function setTheme(theme) {
  if (theme === 'system') {
    localStorage.removeItem(KEY)
    delete document.documentElement.dataset.theme
  } else {
    localStorage.setItem(KEY, theme)
    document.documentElement.dataset.theme = theme
  }
}

const STORAGE_KEY = 'whatson_user'

let listeners = []

function notify() {
  listeners.forEach(fn => fn())
}

export function getUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function signIn(provider) {
  const mockUsers = {
    google: { id: 'g_001', name: 'Kate McCarthy', email: 'kate@gmail.com', avatar: 'KM', provider: 'google', role: null },
    apple:  { id: 'a_001', name: 'Kate McCarthy', email: 'kate@icloud.com', avatar: 'KM', provider: 'apple', role: null },
  }
  const user = mockUsers[provider]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  notify()
  return user
}

export function setRole(role) {
  const user = getUser()
  if (!user) return
  const updated = { ...user, role }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  notify()
}

export function signOut() {
  localStorage.removeItem(STORAGE_KEY)
  notify()
}

export function subscribe(fn) {
  listeners.push(fn)
  return () => { listeners = listeners.filter(l => l !== fn) }
}

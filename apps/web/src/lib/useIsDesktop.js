import { useSyncExternalStore } from 'react'

// The desktop layout. Must match the `@media (min-width: 1024px)` blocks in the
// stylesheets — CSS does the restyling, this is only for the few places where
// desktop renders something different (the list beside the Discover map).
const QUERY = '(min-width: 1024px)'
const mql = window.matchMedia(QUERY)

function subscribe(onChange) {
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

export function useIsDesktop() {
  return useSyncExternalStore(subscribe, () => mql.matches)
}

import { useState, useEffect, useCallback } from 'react'

// Haversine distance between two lat/lng points, in kilometres
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(deg) { return (deg * Math.PI) / 180 }

export function formatDistance(km) {
  if (km == null) return null
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

// Hook: asks the browser for the user's location once on mount. It does not
// watch — a fresh fix only happens when request() is called again.
export function useUserLocation() {
  const [coords, setCoords] = useState(null)
  const [status, setStatus] = useState('idle') // idle | locating | granted | denied | unavailable

  // Resolves with the new coordinates, or null if the fix failed. Callers that
  // want to act on the position — the recentre button — need it back rather
  // than waiting for a state update they cannot tell apart from the last one.
  const request = useCallback(() => {
    if (!('geolocation' in navigator)) { setStatus('unavailable'); return Promise.resolve(null) }
    setStatus('locating')
    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const next = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setCoords(next)
          setStatus('granted')
          resolve(next)
        },
        () => { setStatus('denied'); resolve(null) },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }, [])

  useEffect(() => { request() }, [request])

  return { coords, status, request }
}

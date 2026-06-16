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

// Hook: asks the browser for the user's location once on mount
export function useUserLocation() {
  const [coords, setCoords] = useState(null)
  const [status, setStatus] = useState('idle') // idle | locating | granted | denied | unavailable

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) { setStatus('unavailable'); return }
    setStatus('locating')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStatus('granted')
      },
      () => setStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  useEffect(() => { request() }, [request])

  return { coords, status, request }
}

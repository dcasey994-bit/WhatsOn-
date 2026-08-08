// Where the discover map was last left, and whether the user's first location
// fix has already had its one chance to move it.
//
// Both outlive the page on purpose. Leaving Discover unmounts the map and
// re-runs the location request, so holding this in component state meant every
// return trip re-centred on the user — losing wherever they had panned to, and
// doing it again on the next fix.

let view = null          // { center, zoom } | null
let centred = false

export const getMapView = () => view
export const setMapView = v => { view = v }

export const hasCentredOnUser = () => centred
export const markCentredOnUser = () => { centred = true }

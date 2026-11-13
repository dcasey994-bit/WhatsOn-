// Map background tiles, shared by the Discover map and the address picker.
//
// CARTO stopped serving its raster basemaps without a key in September 2026:
// keyless requests now get tiles stamped "API KEY REQUIRED". The key is free
// (carto.com/basemaps/apikey) and is not a secret — it travels in every tile
// URL the browser requests. The free tier covers 1 million tile requests a
// month for commercial use; a map view is a few dozen tiles.
const KEY = import.meta.env.VITE_CARTO_KEY
const query = KEY ? `?key=${encodeURIComponent(KEY)}` : ''

export const TILE_URLS = {
  dark: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${query}`,
  light: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png${query}`,
}

// Required: the map data is OpenStreetMap's (ODbL) and the styling CARTO's.
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> ' +
  '&copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>'

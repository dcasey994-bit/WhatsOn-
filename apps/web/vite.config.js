import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'WhatsOn? — South London Live Events',
        short_name: 'WhatsOn?',
        description:
          'Find live music, comedy, quizzes and sport happening tonight in Clapham, Balham and Tooting.',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f0f14',
        theme_color: '#0f0f14',
        lang: 'en-GB',
        categories: ['events', 'entertainment', 'lifestyle'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: "What's on tonight", short_name: 'Tonight', url: '/discover' },
          { name: 'Browse events', short_name: 'Browse', url: '/browse' },
          { name: 'Saved events', short_name: 'Saved', url: '/saved' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Never let the service worker intercept the Digital Asset Links file —
        // Android fetches it to verify the TWA, and a cached or rewritten
        // response leaves the app showing a browser address bar.
        navigateFallbackDenylist: [/^\/\.well-known/],
        runtimeCaching: [
          {
            // Map tiles are static and heavy, so worth caching hard.
            urlPattern: /^https:\/\/[a-d]\.basemaps\.cartocdn\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Event images from Supabase Storage.
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'event-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Supabase API calls are deliberately NOT cached. Listings must be
          // live — showing a cached event that has since moved or been pulled
          // is worse than showing nothing.
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})

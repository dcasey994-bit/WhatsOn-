import { Capacitor } from '@capacitor/core'

// True only inside the Capacitor shell (Android/iOS), false in any browser —
// including the installed PWA. Anything that behaves differently in the native
// app should branch on this rather than sniffing the user agent.
export function isNative() {
  return Capacitor.isNativePlatform()
}

// Where Supabase should send the user back to after an OAuth round-trip.
// The native app cannot use a normal https URL: the OAuth flow runs in a
// Custom Tab outside the app, so the redirect has to be a deep link that
// Android hands back to us. Registered in AndroidManifest.xml and in the
// Supabase dashboard's redirect allow-list.
export const NATIVE_AUTH_REDIRECT = 'uk.whatsonapp.app://auth/callback'

export function authRedirectUrl() {
  return isNative() ? NATIVE_AUTH_REDIRECT : window.location.origin
}

// Email confirmation links deliberately do NOT use the deep link above. They
// are opened from a mail app, and many mail clients refuse to linkify a custom
// scheme — the user would see dead text. Sending them to the website works
// everywhere; they confirm there and then sign in normally in the app.
export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://whatsonapp.uk'

export function emailRedirectUrl() {
  return isNative() ? SITE_URL : window.location.origin
}

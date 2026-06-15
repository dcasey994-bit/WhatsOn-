# WhatsOn? — Project Notes

## Deployment
- **Netlify auto-deploys from GitHub.** Pushing to the `claude/live-events-map-vRHxH` branch automatically triggers a Netlify build and deploy.
- **30 deploys/month limit** — resets on the 16th. Only push for meaningful batches of changes, not single fixes.
- Live URL: https://monumental-hamster-c09097.netlify.app
- Build command: `npm run build` · Publish directory: `dist`

## Stack
- React 19 + Vite 8, React Router v7
- Leaflet + react-leaflet (dark map, CartoDB tiles)
- Plain CSS, dark theme (`--bg: #0f0f14`, `--accent: #00ff88`), mobile-first (max-width 430px)
- Supabase for auth + database

## Supabase
- Project URL: `https://lqafmjidqbshssqrxmkr.supabase.co`
- Auth providers enabled: Google OAuth, Email (magic link)
- Tables: `saved_events`, `going_events` (per-user, RLS enabled)
- Schema lives in `supabase-schema.sql`
- Env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) live in `.env` locally (gitignored) and in Netlify env settings.

## Scope
- South London focus: Clapham, Balham, Tooting
- Two-sided marketplace: customers discover events on a map; venues self-list events
- Events are currently a hardcoded mock list in `src/data/events.js` (not yet in DB)

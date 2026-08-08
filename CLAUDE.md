# WhatsOn? — Project Notes

## Repo layout
- `apps/web/` — the React app (this is where `npm run dev` / `npm install` are run from)
- `apps/web/netlify/functions/` — serverless functions (Stripe webhook)
- `supabase/migrations/` — numbered SQL migrations, run in order in the Supabase SQL editor
- `supabase/seed/` — demo data seed
- `netlify.toml` stays at the repo root with `base = "apps/web"`

## Deployment
- **Netlify auto-deploys from GitHub.** Pushing to the `claude/live-events-map-vRHxH` branch automatically triggers a Netlify build and deploy.
- **30 deploys/month limit** — resets on the 17th. Only push for meaningful batches of changes, not single fixes.
- Live URL: https://whatsonapp.uk
- Netlify fallback URL: https://monumental-hamster-c09097.netlify.app
- Base directory: `apps/web` · Build command: `npm run build` · Publish directory: `dist`

## Stack
- React 19 + Vite 8, React Router v7
- Leaflet + react-leaflet (dark map, CartoDB tiles)
- Plain CSS, dark theme (`--bg: #0f0f14`, `--accent: #00ff88`), mobile-first (max-width 430px)
- Supabase for auth + database

## Supabase
- Project URL: `https://lqafmjidqbshssqrxmkr.supabase.co` — read from `VITE_SUPABASE_URL`;
  nothing in `src/` hardcodes it. Moving auth to `auth.whatsonapp.uk` so the Google
  sign-in screen stops naming supabase.co: `docs/google-sign-in-domain.md`
- Auth providers enabled: Google OAuth, Email (magic link)
- Tables: `saved_events`, `going_events`, `venues`, `events` (RLS enabled); schema in `supabase/migrations/001_schema.sql`
- Env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) in `.env` locally and Netlify env settings.

## Stripe (subscriptions)
- Venue mode is free for 3 months, then £20/month
- `subscription_status` on venues: `trialing` | `active` | `lapsed`
- Checkout: Stripe Payment Link — set `VITE_STRIPE_PAYMENT_LINK` in env. URL gets `?client_reference_id={venue_id}` appended.
- Webhook: `apps/web/netlify/functions/stripe-webhook.js` handles `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
- Webhook env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`
- Setup steps: (1) Create £20/mo product + Payment Link in Stripe dashboard, (2) Add webhook endpoint `https://[site]/.netlify/functions/stripe-webhook` in Stripe, (3) Set all env vars in Netlify.

## Scope
- South London focus: Clapham, Balham, Tooting
- Two-sided marketplace: customers discover events on a map; venues self-list events
- Events and venues live in Supabase; there is no mock/fallback data. `apps/web/src/data/events.js` holds only the category definitions.
- Event categories: Live Music, Entertainment (comedy, drag, cabaret, karaoke), Quiz Night, Live Sports. Retired keys are remapped by `getCategory()`.

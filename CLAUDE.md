# WhatsOn? — Project Notes

## Deployment
- **Netlify auto-deploys from GitHub.** Pushing to the `claude/live-events-map-vRHxH` branch automatically triggers a Netlify build and deploy.
- **30 deploys/month limit** — resets on the 17th. Only push for meaningful batches of changes, not single fixes.
- Live URL: https://whatsonapp.uk
- Netlify fallback URL: https://monumental-hamster-c09097.netlify.app
- Build command: `npm run build` · Publish directory: `dist`

## Stack
- React 19 + Vite 8, React Router v7
- Leaflet + react-leaflet (dark map, CartoDB tiles)
- Plain CSS, dark theme (`--bg: #0f0f14`, `--accent: #00ff88`), mobile-first (max-width 430px)
- Supabase for auth + database

## Supabase
- Project URL: `https://lqafmjidqbshssqrxmkr.supabase.co`
- Auth providers enabled: Google OAuth, Email (magic link)
- Tables: `saved_events`, `going_events`, `venues`, `events` (RLS enabled); schema in `supabase-schema.sql`
- Env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) in `.env` locally and Netlify env settings.

## Stripe (subscriptions)
- Venue mode is free for 3 months, then £20/month
- `subscription_status` on venues: `trialing` | `active` | `lapsed`
- Checkout: Stripe Payment Link — set `VITE_STRIPE_PAYMENT_LINK` in env. URL gets `?client_reference_id={venue_id}` appended.
- Webhook: `netlify/functions/stripe-webhook.js` handles `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
- Webhook env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`
- Setup steps: (1) Create £20/mo product + Payment Link in Stripe dashboard, (2) Add webhook endpoint `https://[site]/.netlify/functions/stripe-webhook` in Stripe, (3) Set all env vars in Netlify.

## Scope
- South London focus: Clapham, Balham, Tooting
- Two-sided marketplace: customers discover events on a map; venues self-list events
- Events and venues live in Supabase; there is no mock/fallback data. `src/data/events.js` holds only the category definitions.
- Event categories: Live Music, Entertainment (comedy, drag, cabaret, karaoke), Quiz Night, Live Sports. Retired keys are remapped by `getCategory()`.

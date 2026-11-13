# WhatsOn? — Project Notes

## Repo layout
- `apps/web/` — the React app (this is where `npm run dev` / `npm install` are run from)
- `apps/web/netlify/functions/` — serverless functions (Stripe webhook)
- `supabase/migrations/` — numbered SQL migrations, run in order in the Supabase SQL editor
- `supabase/seed/` — demo data seed
- `netlify.toml` stays at the repo root with `base = "apps/web"`

## Deployment
- **Netlify auto-deploys from GitHub.** Pushing to the `claude/live-events-map-vRHxH` branch automatically triggers a Netlify build and deploy.
- **Netlify credits, not a deploy count.** The free (Personal) plan gives
  **1000 credits per billing period**; the period runs from the **29th** to the
  28th (e.g. Oct 29 – Nov 28) and resets to 1000. Every production deploy costs
  credits (roughly 15 each), and bandwidth, requests and function runs use some
  too — see Netlify → Usage & billing for the live balance. Push meaningful
  batches of changes, not single fixes; put `[skip netlify]` in a commit
  message to push without building.
- Live URL: https://whatsonapp.uk
- Netlify fallback URL: https://monumental-hamster-c09097.netlify.app
- Base directory: `apps/web` · Build command: `npm run build` · Publish directory: `dist`

## Stack
- React 19 + Vite 8, React Router v7
- Leaflet + react-leaflet (dark map, CartoDB tiles). CARTO needs a free key since
  Sept 2026 or tiles say "API KEY REQUIRED": `VITE_CARTO_KEY`, see `src/lib/mapTiles.js`
- Plain CSS, dark theme (`--bg: #0f0f14`, `--accent: #00ff88`), mobile-first (max-width 430px)
- **Desktop layout from 1024px wide**, same pages and URLs. The bottom tabs become
  a rail down the left, `#root` fills the window, and each page widens itself in
  an `@media (min-width: 1024px)` block in its own stylesheet. `.page-column`
  and `.card-grid` (index.css) are the shared pieces; `useIsDesktop()` is for the
  rare JS difference (the list beside the Discover map). Below 1024px — and so
  in the apps — nothing changes: check phone screenshots are identical after
  touching layout.
- Supabase for auth + database
- **Logo:** "Whats" and "?" in the brand green, "On" in black — always use
  `<Wordmark />` (`src/components/Wordmark.jsx`), never type it out. On dark
  backgrounds (dark theme, the Play feature graphic) "On" is white, since black
  would disappear.

## Supabase
- Project URL: `https://lqafmjidqbshssqrxmkr.supabase.co` — read from `VITE_SUPABASE_URL`;
  nothing in `src/` hardcodes it. Moving auth to `auth.whatsonapp.uk` so the Google
  sign-in screen stops naming supabase.co: `docs/google-sign-in-domain.md`
- Auth providers enabled: Google OAuth, Apple, Email + password (`signInWithPassword` / `signUp`, not magic link)
- **Sign in with Apple runs two different flows.** On the web it is an OAuth
  redirect authenticated against a **Services ID** + signed client secret; on
  iOS it is the native sheet, which identifies the app by its **bundle id**
  (`uk.whatsonapp.app`) and needs that in the provider's *Authorized Client IDs*.
  Both must be configured or one platform works and the other does not. Not
  offered on Android — see `hasAppleSignIn()` in `src/lib/platform.js`.
- **Google on the website** uses Google's own button (`src/lib/googleIdentity.js`)
  and `signInWithIdToken`, so Google's screen names whatsonapp.uk, not
  supabase.co. Needs `VITE_GOOGLE_CLIENT_ID`; without it, and in the native apps,
  it is the redirect flow. Setup: `docs/google-sign-in-domain.md` step 0.
- Tables: `saved_events`, `going_events`, `venues`, `events` (RLS enabled); schema in `supabase/migrations/001_schema.sql`
- **Repeating events** are ordinary event rows sharing a `series_id` (migration 015),
  one per date, so nothing that lists events needs to know about them. Dates come
  from `src/data/recurrence.js`; "this and later dates" edits and deletes filter
  on `series_id` + `date >=`.
- **Venue numbers:** views are a counter (`event_view_counts`, bumped by the
  `record_event_view` RPC from the event page — once per browser per day, never
  for the venue's own team or the preview route). Views, saves and going per event
  come from `get_venue_event_stats`, which only answers members of that venue.
- Venue public profile fields: `cover_image_url`, `about` (≤500), `instagram` (bare
  handle), `opening_hours` (free text ≤200).
- Env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) in `.env` locally and Netlify env settings.

## Stripe (subscriptions)
- Venue mode is free for 12 months, then £20/month. The length lives in three
  places that must agree: the `venues.trial_ends_at` default (migration 013),
  `protect_venue_billing()` (migration 014), and the Terms page.
- **Billing columns are server-only.** `subscription_status`, `trial_ends_at`,
  `stripe_*`, `is_demo` and `user_id` ignore writes from the app (the
  `anon`/`authenticated` roles) — a trigger resets them. Only the webhook
  (service role) and the SQL editor can change them. The trigger also makes a
  venue's creator its first admin.
- `profiles` (emails) is readable only for your own row. Looking someone up by
  email goes through the `add_venue_member()` RPC.
- `subscription_status` on venues: `trialing` | `active` | `lapsed`
- Checkout: Stripe Payment Link — set `VITE_STRIPE_PAYMENT_LINK` in env. URL gets `?client_reference_id={venue_id}` appended.
- **Web only.** The Subscribe button is hidden and `startCheckout()` no-ops when `isNative()`, because both stores require in-app purchases of digital services to use their own billing (Apple 3.1.1 rejects outright). Venues subscribe at whatsonapp.uk; the app shows status.
- Webhook: `apps/web/netlify/functions/stripe-webhook.js` handles `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
- Webhook env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`
- Setup steps: (1) Create £20/mo product + Payment Link in Stripe dashboard, (2) Add webhook endpoint `https://[site]/.netlify/functions/stripe-webhook` in Stripe, (3) Set all env vars in Netlify.

## Scope
- South London focus: Clapham, Balham, Tooting
- Two-sided marketplace: customers discover events on a map; venues self-list events
- Events and venues live in Supabase; there is no mock/fallback data. `apps/web/src/data/events.js` holds only the category definitions.
- Event categories: Live Music, Entertainment (comedy, drag, cabaret, karaoke), Quiz Night, Live Sports. Retired keys are remapped by `getCategory()`.

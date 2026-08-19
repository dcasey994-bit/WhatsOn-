# WhatsOn?

Find live music, entertainment, quiz nights and live sport happening tonight in
Clapham, Balham and Tooting. Customers discover events on a map; venues list
their own events.

Live at **[whatsonapp.uk](https://whatsonapp.uk)**.

## Layout

```
apps/
  web/                  React 19 + Vite web app, and the source of both native apps
    src/
    public/
    android/            Capacitor Android project (committed)
    netlify/functions/  Stripe webhook
supabase/
  migrations/           Numbered SQL migrations — run in order
  seed/                 Demo data seed
netlify.toml            Root config; builds from apps/web
```

The native apps are Capacitor shells around the same web build, so `apps/web`
is the only source of app code and all three share one set of Supabase
migrations. The Android project is committed under `apps/web/android`; the iOS
project is generated in CI rather than committed, because there is no Mac in
this toolchain — see `docs/ios-release.md`.

Both are built by manual workflows: `.github/workflows/android-release.yml`
produces a signed `.aab`, `ios-release.yml` a signed `.ipa`. A web change does
not reach an installed native app until one of those is run and the result
uploaded.

## Running the web app

```bash
cd apps/web
npm install
npm run dev
```

Copy `apps/web/.env.example` to `apps/web/.env` and fill in the Supabase keys.

## Database

Run the files in `supabase/migrations/` **in numerical order** in the Supabase
SQL editor. They are idempotent, so re-running one is safe.

`supabase/seed/demo-data.sql` populates the demo account's data and must run
after `006_demo_mode.sql`.

## Deployment

Netlify builds from `apps/web` (set via `base` in `netlify.toml`) and deploys on
every push to `claude/live-events-map-vRHxH`. The free plan allows 30 builds a
month, so push in batches.

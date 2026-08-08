# Getting whatsonapp.uk onto the Google sign-in screen

Signing in with Google shows:

> Sign in — to continue to **lqafmjidqbshssqrxmkr.supabase.co**

That string is the host Google will send the user *back* to: the redirect URI
registered against the OAuth client. Supabase runs the handshake on our behalf,
so its host is the one Google names. No setting in this repo changes it — you
either change where Google redirects, or stop redirecting.

Do step 1 regardless. Step 2 is the fix.

---

## 1. Brand the consent screen (free, ~5 minutes)

Worth doing whichever route follows, and it may improve the screen on its own.

1. Google Cloud Console → the project holding the OAuth client
2. **APIs & Services → OAuth consent screen → Branding**
3. Set:
   - **App name**: `WhatsOn?`
   - **User support email**: dcasey994@gmail.com
   - **App logo**: `apps/web/store/play-icon-512.png`
   - **Application home page**: `https://whatsonapp.uk`
   - **Privacy policy**: `https://whatsonapp.uk/privacy`
   - **Terms of service**: `https://whatsonapp.uk/terms`
4. Under **Authorized domains**, add `whatsonapp.uk`. Leave
   `lqafmjidqbshssqrxmkr.supabase.co` alone — see below.
5. Save, then sign in with Google in a private window and look at the screen.

Whether Google replaces the host with the app name depends on the consent
screen's publishing and verification state. It costs nothing to find out, so
test it before paying for step 2.

Authorized domains normally have to be ones you can prove you own in Search
Console. `supabase.co` is not one of them, which is why Google may keep showing
the raw host however the branding is set — and why step 2 is the actual fix.

### Do not remove the supabase.co authorized domain yet

Every redirect URI's domain must be registered as an authorized domain, and
`https://lqafmjidqbshssqrxmkr.supabase.co/auth/v1/callback` is still the
redirect URI. Removing the domain while that URI is live leaves the OAuth
client inconsistent and sign-in fails. Order, after step 2 is working:

1. Remove the old **redirect URI** (2c step 8)
2. Sign in again to confirm
3. *Then* remove the `lqafmjidqbshssqrxmkr.supabase.co` **authorized domain**

---

## 2. Move Supabase auth to auth.whatsonapp.uk

Fixes web and the Android Custom Tab together, because both go through this
host. Requires the Supabase **Custom Domain** add-on, which requires a paid
plan — check current pricing in the dashboard.

### 2a. Supabase

1. Dashboard → **Project Settings → General → Custom Domains**
2. Enable the add-on, enter `auth.whatsonapp.uk`
3. It gives you a **CNAME** and a **TXT** verification record

### 2b. DNS (wherever whatsonapp.uk is registered)

4. Add the CNAME and TXT exactly as given
5. Back in Supabase, **Verify**, then **Activate**. Propagation is usually
   minutes; the dashboard will keep failing verification until it lands.

### 2c. Google Cloud

6. **APIs & Services → Credentials →** the Web OAuth client
7. Under **Authorized redirect URIs**, add:
   `https://auth.whatsonapp.uk/auth/v1/callback`
8. Leave the old `https://lqafmjidqbshssqrxmkr.supabase.co/auth/v1/callback` in
   place until everything is confirmed working, then remove it.

### 2d. Supabase auth config

9. **Authentication → URL Configuration** — confirm Site URL is
   `https://whatsonapp.uk` and the redirect allow-list still covers it.

### 2e. This repo — one env var, three places

`VITE_SUPABASE_URL` changes from
`https://lqafmjidqbshssqrxmkr.supabase.co` to `https://auth.whatsonapp.uk`:

10. **Netlify** → Site configuration → Environment variables → redeploy
11. **GitHub** → repo Settings → Secrets and variables → Actions → the
    `VITE_SUPABASE_URL` secret
12. Your local `apps/web/.env`

No code change: nothing in `src/` hardcodes the host.

### 2f. Rebuild the Android app

13. The APK and AAB bake `VITE_SUPABASE_URL` in at build time, so installed
    builds keep talking to the old host until rebuilt. Run the **Android
    release bundle** workflow with a new version name, and the debug workflow
    for testing.

### Notes

- **Nobody gets signed out.** `storageKey` is pinned in
  `apps/web/src/lib/supabase.js`; supabase-js would otherwise derive it from
  the project URL and rename it, dropping every stored session.
- The old `*.supabase.co` host keeps working, so this is reversible: put the
  env var back and redeploy.
- Test in a private window — an existing session skips the screen you are
  trying to check.

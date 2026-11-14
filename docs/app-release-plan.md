# Apps: getting 1.1.0 to real testers

Both apps were last built in September. The apps bundle their own copy of the
web code, so nothing since — security fixes, venue tools, logo, map key —
reaches them until they are rebuilt. This plan gets one solid build of each
into testers' hands.

**[You]** = needs your accounts or a phone. **[Me]** = code, done here.

---

## Stage 1 — Unblock the builds (today)

- [x] **[Me]** Fix the Android CI failure (withdrawn SDK `tools` package)
- [x] **[Me]** Confirm the Android debug build passes again
- [ ] **[You]** GitHub → repo Settings → Secrets and variables → Actions →
      **Variables** → `VITE_CARTO_KEY` = `cb1_58m7_1_17cb36f5782f25c561c47d7d`
- [ ] **[You]** Apple Developer → Identifiers → `uk.whatsonapp.app` → tick
      **Sign in with Apple** → regenerate the App Store provisioning profile →
      base64 it and replace the `IOS_PROVISIONING_PROFILE_B64` secret
      (PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("profile.mobileprovision")) | Set-Clipboard`)
- [ ] **[You]** Supabase → Authentication → Providers → Apple → add
      `uk.whatsonapp.app` to **Authorized Client IDs**

**Done when:** the Android debug build is green and the secrets above are set.

## Stage 2 — App fixes, one batch (1–2 days)

- [ ] **[Me]** Native share sheet (Capacitor Share) — Android currently only
      copies the link
- [ ] **[Me]** Shrink and convert photos before upload (HEIC → JPEG, ~1600px),
      for event images and venue cover photos
- [ ] **[Me]** "Send feedback" in Settings — opens an email to the support
      address with app version and platform filled in
- [ ] **[Me]** Show the app version in Settings, so testers can say which
      build they are on
- [ ] **[Me]** Native Google sign-in in the apps, so Google's screen stops
      saying "supabase.co"
  - [ ] **[You]** Google Cloud → Credentials → create an **Android** OAuth
        client (package `uk.whatsonapp.app` + the SHA-1 of the Play app
        signing key, from Play Console → App integrity) and an **iOS** client
        (bundle `uk.whatsonapp.app`); send me both client IDs
  - [ ] **[You]** Supabase → Google provider → add those client IDs to
        **Authorized Client IDs**
- [ ] **[Me]** Crash and error reporting (Sentry, free tier)
  - [ ] **[You]** Create a free Sentry account and project; send me the DSN
        (it is public, not a secret)
  - [ ] **[Me]** Update `docs/play-listing.md` Data safety and the Privacy
        page for crash data
- [ ] **[You]** Set up the support email address (e.g. hello@whatsonapp.uk)
      and tell me what it is

**Done when:** all of the above is merged, the web deploy is checked on a
phone browser, and nothing on the phone-sized pages has changed by accident.

## Stage 3 — Build 1.1.0

- [ ] **[You]** Actions → **Android release bundle** → Run workflow →
      version `1.1.0` → download the `.aab`
- [ ] **[You]** Actions → **iOS release build** → Run workflow → version
      `1.1.0`, upload ticked → appears in App Store Connect → TestFlight in
      ~15 min
- [ ] **[You]** Install both on your own phones and run the test checklist
      below. Anything wrong → back to Stage 2, then rebuild as 1.1.1.

### Test checklist (each platform)

1. Fresh install, open — map loads with real tiles (no "API KEY REQUIRED")
2. Allow location — map centres on you
3. Sign up with email; sign out; sign in with Google; (iPhone) with Apple
4. Save an event, mark going, find both on Saved
5. Share an event — share sheet opens, link opens the event
6. Register a venue — checklist appears
7. Post an event with a photo from the camera roll, weekly repeat
8. See it on the map; see views/saved counts on the manage page
9. Add a team member by email
10. Settings → Send feedback opens email
11. Delete account — signed out, can't sign back in

## Stage 4 — Store setup (in parallel with Stage 2–3)

**Google Play**
- [ ] **[You]** Main store listing — paste from `docs/play-listing.md`, upload
      the icon and `docs/play-assets/feature-graphic.png`
- [ ] **[You]** 4 phone screenshots (after real events are on the map)
- [ ] **[You]** App content: privacy policy, ads (no), data safety, content
      rating, target audience 18+
- [ ] **[You]** Create a **reviewer test account** (not your own) with a demo
      venue; enter it under App access

**App Store / TestFlight**
- [ ] **[You]** TestFlight → Test Information: feedback email, privacy policy
      URL, short "what to test" note, the same reviewer test account
- [ ] **[Me]** Write the "what to test" note and Beta App Review notes

## Stage 5 — Testers

- [ ] **[You]** Get the list together: aim for **15 Android testers** (Google
      needs 12 opted in for 14 days in a row), plus iPhone users
- [ ] **[You]** Play: Testing → Closed testing → create track → upload the
      1.1.0 `.aab` → add the tester email list → share the opt-in link.
      Testers must tap **Become a tester** *and* install from Play.
- [ ] **[You]** TestFlight: internal testers (your team, instant) first; then
      an external group with a public link (needs a ~1 day Beta App Review)
- [ ] **[You]** Make sure the map has real events before invites go out
- [ ] **[Both]** Week 1 and week 2: read feedback and crash reports; fixes go
      out as 1.1.x builds to both stores
- [ ] **[You]** After 14 days with 12+ Android testers: Play Console →
      Apply for production

## Later (not needed for testing)

- Push notifications ("your saved event is tonight")
- App Store public release and Play production (after testing)
- Trademark filing

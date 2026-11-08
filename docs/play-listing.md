# Google Play listing

Everything the Play Console asks for, ready to paste. Character limits are
Google's; each field here is within them.

## Main store listing

**App name** (30 max)

```
WhatsOn? - Events Near You
```

**Short description** (80 max)

```
Live music, comedy, quizzes and sport on tonight in Clapham, Balham & Tooting
```

**Full description** (4000 max)

```
Find out what's happening tonight, right where you are.

WhatsOn? puts every gig, comedy night, pub quiz and live sports screening in Clapham, Balham and Tooting on one map, so you can see what's on near you at a glance — no scrolling through a dozen venue Instagram pages.

WHAT YOU CAN DO
• See tonight's events on a map, centred on where you are
• Filter by Live Music, Entertainment (comedy, drag, cabaret, karaoke), Quiz Night and Live Sports
• Browse what's coming up this week
• Save events you like and mark the ones you're going to
• See how many others are going
• Look up a venue and everything it has on

NO ACCOUNT NEEDED TO LOOK
Browse freely. Create an account only when you want to save events — sign in with email or Google.

YOUR LOCATION STAYS ON YOUR PHONE
Location is optional and only used to centre the map. It is never sent to us or stored, and never tracked in the background.

RUN A VENUE?
List your pub, bar or club and publish your own events in minutes. They appear on the map straight away. Add your team so staff can post events too. Free for your first twelve months.

WhatsOn? is local on purpose. We are starting in South London and growing street by street.
```

**App category:** Events
**Tags** (pick up to five in the console): Events, Nightlife, Music, Local, Entertainment
**Contact email:** your support address (shown publicly)
**Website:** https://whatsonapp.uk
**Privacy policy:** https://whatsonapp.uk/privacy

## Graphics

| Asset | Size | Where |
|---|---|---|
| App icon | 512 × 512 PNG | `apps/web/public/icons/icon-512.png` |
| Feature graphic | 1024 × 500 PNG | `docs/play-assets/feature-graphic.png` |
| Phone screenshots | 2–8, 9:16, min 1080 px on the short side | Take on a phone, see below |

**Screenshots** have to come from a real phone, after real venues are listed:
an empty map sells nothing. Four is enough, in this order:

1. The map with tonight's pins (Discover)
2. An event's detail page
3. The Browse list
4. A venue's profile page

Android: Power + Volume Down. Crop out the status bar if it shows personal
notifications.

## App content (Policy → App content)

**Privacy policy:** https://whatsonapp.uk/privacy

**Ads:** No, the app does not contain ads.

**App access:** All functionality is available without special access *except*
venue management, which needs an account. Google's reviewers need a login for
that: create a dedicated test account (not your own), give it a demo venue, and
enter its email and password here.

**Target audience:** 18 and over. Events are mostly in pubs and bars.

**Content rating questionnaire:** Category "Reference, News, or Educational" is
wrong — choose **"All other app types"**. Answer No to violence, sexual content,
language, controlled substances and gambling. The honest answers that may come
up: the app *references* venues that serve alcohol (Yes to "references to
alcohol" if asked) and users can share user-generated content (venues publish
events, so Yes to "users can interact or exchange content" if asked).

**News app:** No. **Government app:** No. **Financial features:** None.
**Health:** No.

## Data safety

Google counts data as *collected* only when it leaves the device. Service
providers that process data for us (Supabase, Netlify) are not *sharing*.

**Does the app collect or share user data?** Yes, collects. Does not share.
**Is all data encrypted in transit?** Yes (HTTPS throughout).
**Can users request deletion?** Yes — in the app (Settings → Delete account)
and at https://whatsonapp.uk/delete-account (the URL Google asks for).

Data types to tick, all "Collected", none "Shared":

| Type | Required or optional | Purpose | Why |
|---|---|---|---|
| Personal info → Email address | Optional (browsing needs no account) | Account management | Sign-in |
| Personal info → Name | Optional | Account management | From Google sign-in |
| App activity → Other actions | Optional | App functionality | Saved and going events |
| Photos and videos → Photos | Optional | App functionality | Venues' event images |
| Personal info → Other info | Optional | App functionality | Venue name, address, phone, website |

**Do not tick:**
- **Location** — used on the device to centre the map, never sent anywhere.
- **Financial info** — the Android app takes no payments; venue subscriptions
  are paid on the website through Stripe.
- **Device IDs, analytics, crash logs** — the app has no analytics or crash
  reporting.

If an analytics or crash-reporting library is ever added, this form must be
updated before that release.

## Closed testing (needed before production)

New personal developer accounts must run a closed test with **at least 12
testers opted in for 14 days in a row** before applying for production.

1. Testing → Closed testing → Create track → upload the AAB from the Android
   release workflow.
2. Testers → create an email list with 12+ Google account emails (aim for 15:
   people drop out, and the count must stay at 12 throughout).
3. Share the opt-in link. Each tester must open it, tap **Become a tester**,
   then install from Play — opting in without installing does not count.
4. Ask them to open the app a few times over the fortnight. Google asks about
   tester engagement when you apply for production.
5. After 14 days: Dashboard → Apply for production.

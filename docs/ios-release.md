# Shipping WhatsOn? to the App Store without a Mac

`.github/workflows/ios-release.yml` builds and signs the iOS app on a
GitHub-hosted macOS runner. Nothing below needs a Mac — the certificate work
that normally sends people to Keychain Access is done with `openssl` instead.

**The workflow is untested.** It was written without access to macOS. Expect
the first run to fail somewhere in signing or export, and see
[When it fails](#when-it-fails).

## What it costs

| | |
|---|---|
| Apple Developer Program | **£79/year**, renewing — unlike Play's one-off $25 |
| macOS CI minutes | billed at **10×** the Linux rate; a run is 15–20 min |

On a free GitHub account that works out at roughly ten builds a month. Enrolment
as an individual takes a day or two; as a company it needs a D-U-N-S number and
takes considerably longer.

## Secrets to set

Settings → Secrets and variables → Actions.

| Secret | What it is |
|---|---|
| `IOS_CERTIFICATE_P12_B64` | Apple Distribution certificate + private key, as base64 `.p12` |
| `IOS_CERTIFICATE_PASSWORD` | The password you chose when exporting that `.p12` |
| `IOS_PROVISIONING_PROFILE_B64` | App Store provisioning profile, as base64 `.mobileprovision` |
| `IOS_TEAM_ID` | Ten characters, from the Apple Developer membership page |
| `ASC_KEY_ID` | App Store Connect API key ID — only needed to upload |
| `ASC_ISSUER_ID` | Issuer ID from the same page |
| `ASC_PRIVATE_KEY` | Contents of the `AuthKey_XXXXXXXXXX.p8` file |

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PAYMENT_LINK` and
`VITE_SITE_URL` are already set for the Android workflow and are reused.

## 1. The certificate, without Keychain Access

A certificate signing request is just an RSA key and a CSR. Keychain Access is
one way to make them; `openssl` is another, and it runs anywhere.

```bash
openssl genrsa -out ios_distribution.key 2048

openssl req -new -key ios_distribution.key -out ios_distribution.csr \
  -subj "/emailAddress=hello@whatsonapp.uk/CN=WhatsOn Distribution/C=GB"
```

Then at **developer.apple.com → Certificates, Identifiers & Profiles**:

1. **Certificates → +** → *Apple Distribution* → upload `ios_distribution.csr`
2. Download the resulting `distribution.cer`

Combine the downloaded certificate with the key you kept:

```bash
openssl x509 -inform DER -in distribution.cer -out distribution.pem -outform PEM

openssl pkcs12 -export -legacy \
  -inkey ios_distribution.key -in distribution.pem \
  -name "Apple Distribution" \
  -out ios_distribution.p12 -passout pass:CHOOSE_A_PASSWORD
```

**`-legacy` matters.** OpenSSL 3 defaults to AES-256 for PKCS#12, which macOS's
`security import` cannot read — the workflow fails with an unhelpful
`MAC verification failed`. If your openssl is 1.x, drop the flag.

Guard `ios_distribution.key` and the `.p12` like passwords. Losing them means
revoking the certificate and starting over; leaking them lets someone else sign
software as you.

## 2. App ID and provisioning profile

1. **Identifiers → +** → App IDs → App → Bundle ID **`uk.whatsonapp.app`**,
   matching `appId` in `apps/web/capacitor.config.json`
2. No extra capabilities are needed. Location comes from the OS prompt, not an
   entitlement, and there is no push, no sign-in-with-Apple, no associated
   domains.
3. **Profiles → +** → *App Store Connect* → pick that App ID → pick the
   distribution certificate → name it, download the `.mobileprovision`

The workflow reads the profile's name out of the file itself, so the name you
choose does not need to be recorded anywhere.

## 3. App Store Connect API key

**App Store Connect → Users and Access → Integrations → App Store Connect API
→ +**, role **App Manager**.

The `.p8` downloads **once and only once**. Save it somewhere durable before
closing the page.

## 4. Base64 everything

```bash
base64 -w0 ios_distribution.p12   > p12.b64          # Linux
base64 -w0 profile.mobileprovision > profile.b64
# macOS has no -w0; use: base64 -i ios_distribution.p12 -o p12.b64
```

Paste the contents of each `.b64` into the matching secret. For
`ASC_PRIVATE_KEY`, paste the `.p8` file as-is, `BEGIN PRIVATE KEY` line and all.

## 5. Run it

Actions → **iOS release build** → Run workflow.

- **version_name** — what the store shows, e.g. `1.0.2`
- **build_number** — leave blank; the run number is used
- **upload** — leave **off** for the first few runs

With upload off you get an `.ipa` in the run's Artifacts and nothing reaches
Apple. Turn it on once a build looks right; every build number accepted by App
Store Connect is spent permanently.

## When it fails

The steps most likely to break, and what they usually mean:

**`security import` → `MAC verification failed`**
The `.p12` was made by OpenSSL 3 without `-legacy`. Remake it.

**`No signing certificate "iOS Distribution" found`**
The certificate is a *Development* one rather than *Apple Distribution*, or the
`.p12` contains the certificate without its private key — check that
`openssl pkcs12` was given both `-inkey` and `-in`.

**`exportArchive` → `No profiles for 'uk.whatsonapp.app' were found`**
The profile is for a different bundle ID, or it is a Development profile rather
than App Store. It must also reference the same certificate that was imported.

**`method` rejected in ExportOptions**
Xcode 15.4 renamed `app-store` to `app-store-connect`. The workflow pins
Xcode 16 and uses the new name; on an older Xcode, change it back.

**`npx cap add ios` fails on CocoaPods**
`cap sync ios` runs `pod install`. If the runner image ships a Ruby that fights
with CocoaPods, add a `gem install cocoapods` step before it.

## What still has to be done by hand

The workflow produces a signed binary. It does not create the App Store listing:

- Create the app record in App Store Connect — name, subtitle, category, privacy
  policy URL (`https://whatsonapp.uk/privacy`), account deletion URL
  (`https://whatsonapp.uk/delete-account`)
- **Screenshots**: one 6.9" iPhone set (1290×2796 or 1320×2868) is the minimum;
  add 13" iPad (2048×2732) only if you declare iPad support. These can be
  generated the same way the Play screenshots were, from a headless browser at
  those exact viewports — Apple does not check that they came from a device.
- Fill in App Privacy, which asks the same questions as Play's Data safety and
  should get the same answers
- Submit for review

## Two risks worth knowing before spending the £79

**Guideline 4.2, Minimum Functionality.** Apple rejects apps that are a website
in a wrapper. Capacitor apps pass regularly, but they have to earn it. WhatsOn?
has a map and uses location, which helps. A reviewer opening it to an empty map
because no real venues are listed does not.

**Guideline 3.1.1, In-App Purchase.** Apple's rule is stricter than Google's and
enforced harder: a subscription unlocking functionality inside the app must go
through Apple's IAP at 15–30%, not Stripe.

This is handled. The subscription card in `VenueManagePage` shows the Subscribe
button only on the web; natively it reports the state and says subscriptions are
managed from a browser, with no button, no price and no link. `startCheckout()`
also returns early on native, so a future caller cannot reopen the hole.

What that leaves: the price and Stripe are still named in the Terms of Service.
That is a legal document rather than a call to action, which is normally fine —
but it is the remaining place a reviewer could point at.

Both of these are worth settling before the Android production submission, since
they are the same two questions in different clothing.

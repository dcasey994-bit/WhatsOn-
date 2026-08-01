import { useNavigate } from 'react-router-dom'
import './LegalPage.css'

// Google Play requires a reachable privacy policy for any app that collects
// location or account data. Linked from the sign-in page and Account Settings.
export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div className="legal-page">
      <div className="legal-head">
        <button className="legal-back" onClick={() => navigate(-1)}>← Back</button>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: August 2026</p>
      </div>

      <div className="legal-body">
        <section>
          <h2>Who we are</h2>
          <p>
            WhatsOn? is an app for finding live events at venues in South London.
            This policy explains what we collect, why, and what you can do about it.
            Contact us at <a href="mailto:hello@whatsonapp.uk">hello@whatsonapp.uk</a>.
          </p>
        </section>

        <section>
          <h2>What we collect</h2>
          <h3>If you browse without an account</h3>
          <p>
            Your approximate location, only if you grant permission, and only to
            centre the map near you. It is used on your device and is not sent to
            our servers or stored.
          </p>

          <h3>If you create an account</h3>
          <ul>
            <li>Your email address, and your name and profile picture if you sign in with Google</li>
            <li>Events you save or mark yourself as going to</li>
            <li>Your appearance and mode preferences, stored on your device</li>
          </ul>

          <h3>If you list a venue</h3>
          <ul>
            <li>Venue details you enter: name, address, phone, website, capacity</li>
            <li>Events you publish, including any images you upload</li>
            <li>Who you invite to help manage the venue</li>
            <li>Subscription status. Card details are handled by Stripe and never reach us</li>
          </ul>
        </section>

        <section>
          <h2>How we use it</h2>
          <p>
            To show you events near you, keep your saved events across devices,
            let venues publish listings, and take payment for venue subscriptions.
            We do not sell your data, and we do not use it for advertising.
          </p>
        </section>

        <section>
          <h2>Who else is involved</h2>
          <ul>
            <li><strong>Supabase</strong> — hosts our database and handles sign-in</li>
            <li><strong>Netlify</strong> — hosts the app</li>
            <li><strong>Stripe</strong> — processes venue subscription payments</li>
            <li><strong>CARTO</strong> and <strong>OpenStreetMap</strong> — supply map tiles</li>
            <li><strong>Nominatim</strong> — converts a venue address into map coordinates when a venue is added</li>
          </ul>
          <p>
            Google is also involved if you choose to sign in with a Google account.
          </p>
        </section>

        <section>
          <h2>Location</h2>
          <p>
            Location is optional. Decline it and the map simply centres on Balham
            instead. You can change your mind at any time in your browser or phone
            settings. We never track your location in the background.
          </p>
        </section>

        <section>
          <h2>Your rights</h2>
          <p>
            Under UK GDPR you can ask for a copy of your data, ask us to correct
            it, or ask us to delete it. Email{' '}
            <a href="mailto:hello@whatsonapp.uk">hello@whatsonapp.uk</a> and we
            will respond within 30 days. Deleting your account removes your saved
            events, and any venues you solely manage along with their listings.
          </p>
        </section>

        <section>
          <h2>Keeping data</h2>
          <p>
            Account and venue data is kept while your account is active. Past
            events remain visible to the venue that published them. Delete your
            account and we remove your personal data, other than anything we must
            keep for accounting.
          </p>
        </section>

        <section>
          <h2>Children</h2>
          <p>
            WhatsOn? lists events at pubs and bars and is not intended for anyone
            under 18. We do not knowingly collect data from children.
          </p>
        </section>

        <section>
          <h2>Changes</h2>
          <p>
            If this policy changes materially we will say so in the app before the
            change takes effect.
          </p>
        </section>
      </div>
    </div>
  )
}

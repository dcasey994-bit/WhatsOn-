import { useNavigate } from 'react-router-dom'
import './LegalPage.css'

export default function TermsPage() {
  const navigate = useNavigate()

  return (
    <div className="legal-page">
      <div className="legal-head">
        <button className="legal-back" onClick={() => navigate(-1)}>← Back</button>
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: August 2026</p>
      </div>

      <div className="legal-body">
        <section>
          <h2>Using WhatsOn?</h2>
          <p>
            WhatsOn? helps you find live events at venues in South London. You may
            browse without an account. An account is needed to save events, mark
            yourself as going, or list a venue.
          </p>
        </section>

        <section>
          <h2>Event listings</h2>
          <p>
            Events are published by the venues themselves. We do not verify them.
            Times, prices and whether an event is running can change at short
            notice, so check with the venue before setting out. We are not
            responsible for an event that is cancelled, moved, or different from
            its listing.
          </p>
        </section>

        <section>
          <h2>If you list a venue</h2>
          <ul>
            <li>You confirm you are authorised to represent that venue</li>
            <li>Your listings must be accurate and kept up to date</li>
            <li>You are responsible for anyone you invite to help manage it</li>
            <li>Do not upload images you do not have the right to use</li>
          </ul>
          <p>
            We may remove listings that are inaccurate, misleading or offensive.
          </p>
        </section>

        <section>
          <h2>Venue subscriptions</h2>
          <p>
            Each venue gets twelve months free. After that it is £20 per month per
            venue, billed through Stripe. Cancel any time and the venue stays
            active until the end of the paid period, after which it is archived
            and its events stop appearing publicly. Archived data is not deleted —
            resubscribing restores it.
          </p>
        </section>

        <section>
          <h2>Acceptable use</h2>
          <p>
            Do not misuse the service: no false listings, no attempting to access
            other people's accounts or venues, no automated scraping.
          </p>
        </section>

        <section>
          <h2>Liability</h2>
          <p>
            WhatsOn? is provided as-is. We do not guarantee it will be available
            without interruption or that listings are accurate. Nothing here
            limits liability that cannot be limited by law.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions about these terms:{' '}
            <a href="mailto:hello@whatsonapp.uk">hello@whatsonapp.uk</a>
          </p>
        </section>
      </div>
    </div>
  )
}

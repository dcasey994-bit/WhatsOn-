import { useNavigate } from 'react-router-dom'
import './LegalPage.css'

// Public, and deliberately reachable without signing in.
//
// Google Play requires a URL where anyone can find out how to delete their
// account and the data attached to it — it is asked for on the Data safety
// form and shown on the store listing, so people land here cold, from outside
// the app. That is why it repeats the in-app steps instead of only linking to
// them, and why the email route is given equal weight: someone who has lost
// access to their account cannot use the in-app button at all.
export default function DeleteAccountPage() {
  const navigate = useNavigate()

  return (
    <div className="legal-page">
      <div className="legal-head">
        <button className="legal-back" onClick={() => navigate('/')}>← WhatsOn?</button>
        <h1>Delete your account</h1>
        <p className="legal-updated">Last updated: August 2026</p>
      </div>

      <div className="legal-body">
        <section>
          <h2>In the app</h2>
          <p>
            Open <strong>Account Settings</strong>, scroll to{' '}
            <strong>Delete account</strong>, and confirm. It takes effect
            immediately — there is no waiting period and no way to undo it.
          </p>
        </section>

        <section>
          <h2>If you cannot sign in</h2>
          <p>
            Email <a href="mailto:hello@whatsonapp.uk">hello@whatsonapp.uk</a>{' '}
            from the address on the account and ask us to delete it. We will
            confirm it is you, delete the account, and reply within 30 days.
          </p>
        </section>

        <section>
          <h2>What gets deleted</h2>
          <ul>
            <li>Your account and sign-in details, including any Google connection</li>
            <li>Your email address, and your name and profile picture if you signed in with Google</li>
            <li>Your saved events, saved venues, and anything you marked yourself as going to</li>
            <li>Your place on the team of any venue you help run</li>
          </ul>
          <p>
            All of it is removed straight away, not archived. Preferences kept on
            your device, such as your appearance setting, go when you uninstall
            the app.
          </p>
        </section>

        <section>
          <h2>What happens to your venues</h2>
          <p>
            If you are the <strong>last admin</strong> of a venue, that venue is
            deleted along with the events it has published. If someone else is
            also an admin, the venue is handed over to them and carries on — only
            your access to it goes.
          </p>
          <p>
            Deleting your account does not cancel a paid venue subscription.
            Cancel that first, or it will keep billing.
          </p>
        </section>

        <section>
          <h2>What we have to keep</h2>
          <p>
            Records we are required to hold for accounting, such as invoices for
            venue subscriptions, are kept for as long as the law requires. They
            are not used for anything else.
          </p>
        </section>

        <section>
          <h2>Questions</h2>
          <p>
            Email <a href="mailto:hello@whatsonapp.uk">hello@whatsonapp.uk</a>.
            Our <button className="legal-inline-link" onClick={() => navigate('/privacy')}>Privacy Policy</button>{' '}
            explains what we collect and why.
          </p>
        </section>
      </div>
    </div>
  )
}

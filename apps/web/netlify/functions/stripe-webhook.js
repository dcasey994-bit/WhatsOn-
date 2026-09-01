// ESM, not CommonJS: apps/web/package.json sets "type": "module", which makes
// every .js file here a module. `require` is not defined in one, so a
// CommonJS version of this file throws on the first line at runtime — after
// Stripe has already taken the money.
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Every line this function writes is prefixed so it can be found in the
// Netlify function log among the platform's own noise.
const log = (...args) => console.log('[stripe-webhook]', ...args)

// Stripe signs the exact bytes it sent. Netlify hands the body back base64
// encoded whenever it decides the content is not plain text, and a re-encoded
// body will not match the signature — every delivery then fails with
// "No signatures found matching the expected payload", which reads like a
// wrong signing secret and is not one.
function rawBody(event) {
  return event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body
}

// The venue is normally identified by client_reference_id, which startCheckout()
// appends to the Payment Link. A subscription started any other way — a link
// sent by email, a bookmark, the Stripe-hosted page opened directly — arrives
// without it, so fall back to the paying customer's email address. Venues are
// not unique per user, so this only resolves when the answer is unambiguous;
// guessing would activate the wrong venue silently.
async function findVenueByEmail(email) {
  if (!email) return null

  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (pErr) throw pErr
  if (!profile) {
    log('no profile for', email, '— that address has no WhatsOn account')
    return null
  }

  const { data: venues, error: vErr } = await supabase
    .from('venues')
    .select('id, name')
    .eq('user_id', profile.id)

  if (vErr) throw vErr
  if (!venues?.length) {
    log('profile', profile.id, 'owns no venues')
    return null
  }
  if (venues.length > 1) {
    log('AMBIGUOUS:', email, 'owns', venues.length, 'venues —',
      venues.map(v => `${v.name} (${v.id})`).join(', '),
      '— activate the right one by hand')
    return null
  }

  log('matched', email, '→ venue', venues[0].id, `(${venues[0].name})`, 'by email')
  return venues[0].id
}

// An update that matches nothing is not an error in PostgREST: it succeeds and
// changes zero rows. Without asking for the rows back, a wrong venue id is
// indistinguishable from a working subscription, in Stripe and in Netlify both.
async function updateVenues(patch, column, value, what) {
  const { data, error } = await supabase
    .from('venues')
    .update(patch)
    .eq(column, value)
    .select('id')

  if (error) {
    log('FAILED', what, `${column}=${value}:`, error.message)
    throw error
  }
  if (!data.length) {
    log('NO MATCH', what, `— no venue with ${column}=${value}`)
    return 0
  }
  log('OK', what, '→', data.map(v => v.id).join(', '))
  return data.length
}

// A subscription belongs to a venue; a Stripe customer belongs to a person, and
// one person may pay for several venues. Matching a cancellation on the customer
// would therefore archive every venue they run, not the one they cancelled — so
// the subscription id, which is unique per venue, is always tried first.
//
// The customer is only a fallback, for a venue that was activated before its
// subscription id was recorded, and only when that customer owns exactly one
// venue. Beyond that there is no way to know which venue is meant, and picking
// one would take a paying venue offline.
async function updateBySubscription(sub, patch, what) {
  if (sub.id && await updateVenues(patch, 'stripe_subscription_id', sub.id, what)) return

  const { data, error } = await supabase
    .from('venues')
    .select('id')
    .eq('stripe_customer_id', sub.customer)
  if (error) throw error

  if (!data.length) {
    log('NO MATCH', what, '— no venue for subscription', sub.id, 'or customer', sub.customer)
    return
  }
  if (data.length > 1) {
    log('AMBIGUOUS', what, '— customer', sub.customer, 'has', data.length,
      'venues and subscription', sub.id, 'is on none of them:',
      data.map(v => v.id).join(', '), '— left alone')
    return
  }
  log('falling back to customer', sub.customer, '— single venue')
  await updateVenues(patch, 'id', data[0].id, what)
}

export const handler = async (event) => {
  let stripeEvent
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody(event),
      event.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    log('SIGNATURE REJECTED:', err.message,
      `(body ${event.isBase64Encoded ? 'was' : 'was not'} base64 encoded)`)
    return { statusCode: 400, body: `Webhook error: ${err.message}` }
  }

  const { type, data } = stripeEvent
  log('received', type, stripeEvent.id)

  try {
    if (type === 'checkout.session.completed') {
      const session = data.object
      let venueId = session.client_reference_id

      if (!venueId) {
        const email = session.customer_details?.email || session.customer_email
        log('no client_reference_id on', session.id, '— falling back to email', email)
        venueId = await findVenueByEmail(email)
      }

      if (!venueId) {
        // Retrying will not conjure a venue, so the delivery is accepted. The
        // log above is the record that a payment was taken and landed nowhere.
        log('UNRESOLVED: payment', session.id, 'could not be matched to a venue')
        return { statusCode: 200, body: 'unmatched' }
      }

      await updateVenues(
        {
          subscription_status: 'active',
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
        },
        'id', venueId, 'activate'
      )
    }

    // Renewals, reactivations, and anything changed from the Stripe dashboard
    // or the Customer Portal. checkout.session.completed only ever fires once,
    // so without this a subscription repaired later never reaches the app.
    if (type === 'customer.subscription.updated') {
      const sub = data.object
      const live = sub.status === 'active' || sub.status === 'trialing'
      // A cancellation scheduled for the end of the paid period leaves the
      // subscription active until then, and the venue stays live: they have
      // paid for the month.
      if (sub.cancel_at_period_end) {
        log('subscription', sub.id, 'set to cancel at period end —',
          'venue stays active until customer.subscription.deleted')
      }
      await updateBySubscription(sub, {
        subscription_status: live ? 'active' : 'archived',
        stripe_subscription_id: live ? sub.id : null,
      }, `subscription ${sub.status}`)
    }

    // Archive only when Stripe gives up on the subscription entirely.
    // invoice.payment_failed is deliberately NOT handled: Stripe retries failed
    // payments for ~2 weeks and recovers most of them; subscription.deleted
    // fires once those retries are exhausted (or the venue cancels).
    if (type === 'customer.subscription.deleted') {
      const sub = data.object
      await updateBySubscription(sub,
        { subscription_status: 'archived', stripe_subscription_id: null },
        'archive')
    }
  } catch (err) {
    // A database error is worth retrying, unlike an unmatched venue, so this
    // returns 500 and Stripe redelivers.
    log('ERROR handling', type, '-', err.message)
    return { statusCode: 500, body: 'handler error' }
  }

  return { statusCode: 200, body: 'ok' }
}

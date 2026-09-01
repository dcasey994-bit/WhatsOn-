// Opens Stripe's hosted billing portal for one venue, so an admin can cancel,
// update a card, or download invoices without any of that being rebuilt here.
//
// ESM, not CommonJS — apps/web/package.json sets "type": "module".
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Service role: this function reads venues and memberships on behalf of a user
// it has authenticated itself, so it deliberately runs outside RLS. Every query
// below is therefore constrained by hand — see checkAdmin.
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const log = (...args) => console.log('[stripe-portal]', ...args)
const fail = (statusCode, error) => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ error }),
})

// The venue id alone must never be enough to reach a billing portal: it appears
// in URLs and is readable by anyone browsing the app, and the portal can cancel
// a subscription. So the caller proves who they are with their Supabase access
// token, and that user has to be an admin of this venue.
async function checkAdmin(venue, userId) {
  if (venue.user_id === userId) return true

  const { data, error } = await supabase
    .from('venue_members')
    .select('role')
    .eq('venue_id', venue.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data?.role === 'admin'
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return fail(405, 'Use POST')

  const token = (event.headers.authorization || '').replace(/^Bearer /i, '')
  if (!token) return fail(401, 'Not signed in')

  let venueId
  try {
    ({ venueId } = JSON.parse(event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString()
      : event.body))
  } catch {
    return fail(400, 'Bad request body')
  }
  if (!venueId) return fail(400, 'Missing venueId')

  try {
    const { data: auth, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !auth?.user) {
      log('rejected token:', authErr?.message || 'no user')
      return fail(401, 'Not signed in')
    }
    const userId = auth.user.id

    const { data: venue, error: vErr } = await supabase
      .from('venues')
      .select('id, name, user_id, stripe_customer_id, stripe_subscription_id')
      .eq('id', venueId)
      .maybeSingle()
    if (vErr) throw vErr
    if (!venue) return fail(404, 'Venue not found')

    if (!await checkAdmin(venue, userId)) {
      log('user', userId, 'is not an admin of venue', venueId)
      return fail(403, 'Only a venue admin can manage billing')
    }

    if (!venue.stripe_customer_id) {
      log('venue', venueId, 'has no Stripe customer — never subscribed')
      return fail(400, 'This venue has no subscription to manage')
    }

    // One person can pay for several venues, and every subscription is the same
    // £20/mo product — so in a portal listing two of them there is nothing on
    // screen to say which venue is which, and cancelling the wrong one takes a
    // paying venue offline. When that is possible, the session is scoped to
    // this venue's subscription; a single-subscription customer gets the full
    // portal, with invoices and card updates.
    const { data: subs } = await stripe.subscriptions.list({
      customer: venue.stripe_customer_id,
      status: 'active',
      limit: 100,
    })

    const scoped = subs.length > 1 && venue.stripe_subscription_id
    const session = await stripe.billingPortal.sessions.create({
      customer: venue.stripe_customer_id,
      return_url: `${process.env.VITE_SITE_URL || 'https://whatsonapp.uk'}/manage/venues/${venue.id}`,
      ...(scoped && {
        flow_data: {
          type: 'subscription_cancel',
          subscription: venue.stripe_subscription_id,
        },
      }),
    })

    log('portal for venue', venueId, `(${venue.name})`,
      scoped ? `scoped to ${venue.stripe_subscription_id} of ${subs.length} subs` : 'full portal')

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    }
  } catch (err) {
    log('ERROR:', err.message)
    return fail(500, 'Could not open the billing portal')
  }
}

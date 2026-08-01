const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature']
  let stripeEvent

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    return { statusCode: 400, body: `Webhook error: ${err.message}` }
  }

  const { type, data } = stripeEvent

  if (type === 'checkout.session.completed') {
    const session = data.object
    const venueId = session.client_reference_id
    if (!venueId) return { statusCode: 400, body: 'Missing client_reference_id' }

    await supabase
      .from('venues')
      .update({
        subscription_status: 'active',
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
      })
      .eq('id', venueId)
  }

  // Archive only when Stripe gives up on the subscription entirely.
  // invoice.payment_failed is deliberately NOT handled: Stripe retries failed
  // payments for ~2 weeks and recovers most of them; subscription.deleted
  // fires once those retries are exhausted (or the venue cancels).
  if (type === 'customer.subscription.deleted') {
    const sub = data.object
    await supabase
      .from('venues')
      .update({ subscription_status: 'archived', stripe_subscription_id: null })
      .eq('stripe_customer_id', sub.customer)
  }

  return { statusCode: 200, body: 'ok' }
}

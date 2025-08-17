import { stripe, PRICE_IDS } from './config';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
  const { plan, term = 'monthly', customerEmail, successUrl, cancelUrl, userId } = req.body || {};

    const planKey = typeof plan === 'string' ? plan.toLowerCase() : '';
    const termKey = typeof term === 'string' ? term.toLowerCase() : 'monthly';

    const priceMap = {
      pro: {
        monthly: PRICE_IDS.PRO_MONTHLY,
        yearly: PRICE_IDS.PRO_YEARLY,
      },
      proplus: {
        monthly: PRICE_IDS.PRO_PLUS_MONTHLY,
        yearly: PRICE_IDS.PRO_PLUS_YEARLY,
      },
    };

    const priceId = priceMap[planKey]?.[termKey];

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID not configured for this plan/term' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: customerEmail,
      allow_promotion_codes: true,
      success_url: successUrl || `${req.headers.origin}/login?status=success` ,
      cancel_url: cancelUrl || `${req.headers.origin}/prices?status=cancelled`,
      billing_address_collection: 'auto',
      metadata: {
        plan: planKey,
        term: termKey,
        supabase_user_id: userId || '',
      },
      client_reference_id: userId || undefined,
    });

    return res.status(200).json({ id: session.id, url: session.url });
  } catch (err) {
    console.error('Stripe checkout error', err);
  const status = err?.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 400;
  return res.status(status).json({ error: err?.message || 'Stripe error', code: err?.code || 'stripe_error' });
  }
}

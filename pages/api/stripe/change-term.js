import { stripe, PRICE_IDS } from './config';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getAuthUserId } from '../../../lib/authServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const authedUserId = await getAuthUserId(req);
    if (!authedUserId) return res.status(401).json({ error: 'Unauthorized' });
    const { targetTerm } = req.body || {};
    const termKey = typeof targetTerm === 'string' ? targetTerm.toLowerCase() : '';
    if (!['monthly','yearly'].includes(termKey)) return res.status(400).json({ error: 'Invalid targetTerm' });

    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', authedUserId)
      .single();
    if (profErr || !profile?.stripe_customer_id) return res.status(404).json({ error: 'No Stripe customer on file' });

    const subsList = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: 'all', limit: 5, expand: ['data.items.data.price'] });
    const sub = subsList.data.find(s => ['active','trialing','past_due','incomplete'].includes(s.status));
    if (!sub) return res.status(404).json({ error: 'No subscription to update' });
    const item = sub.items.data[0];

    // Determine current plan from current price id
    const priceId = item.price?.id;
    let planKey = null;
    if (priceId === PRICE_IDS.PRO_MONTHLY || priceId === PRICE_IDS.PRO_YEARLY) planKey = 'pro';
    if (priceId === PRICE_IDS.PRO_PLUS_MONTHLY || priceId === PRICE_IDS.PRO_PLUS_YEARLY) planKey = 'proplus';
    if (!planKey) return res.status(400).json({ error: 'Unknown current plan' });

    const map = {
      pro: { monthly: PRICE_IDS.PRO_MONTHLY, yearly: PRICE_IDS.PRO_YEARLY },
      proplus: { monthly: PRICE_IDS.PRO_PLUS_MONTHLY, yearly: PRICE_IDS.PRO_PLUS_YEARLY },
    };
    const newPrice = map[planKey]?.[termKey];
    if (!newPrice) return res.status(400).json({ error: 'Target price not configured' });

    const updated = await stripe.subscriptions.update(sub.id, {
      proration_behavior: 'create_prorations',
      items: [{ id: item.id, price: newPrice }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    return res.status(200).json({ subscriptionId: updated.id, status: updated.status, price: newPrice });
  } catch (err) {
    console.error('change-term error', err);
    const status = err?.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 400;
    return res.status(status).json({ error: err?.message || 'Stripe error' });
  }
}

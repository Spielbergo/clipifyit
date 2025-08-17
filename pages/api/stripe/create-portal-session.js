import { stripe } from './config';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { customerId, customerEmail, returnUrl, userId } = req.body || {};

    let custId = customerId || null;
    // Prefer resolving by userId via Supabase profile
    if (!custId && userId && supabaseAdmin) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();
      custId = profile?.stripe_customer_id || null;
    }
    // Fallback: find by email
    if (!custId && customerEmail) {
      const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
      custId = customers?.data?.[0]?.id || null;
    }

    if (!custId) return res.status(404).json({ error: 'No Stripe customer found for this user/email' });

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: custId,
      return_url: returnUrl || `${req.headers.origin}/dashboard`,
    });

    return res.status(200).json({ url: portalSession.url });
  } catch (err) {
  console.error('Stripe portal error', err);
  const status = err?.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 400;
  return res.status(status).json({ error: err?.message || 'Stripe error', code: err?.code || 'stripe_error' });
  }
}

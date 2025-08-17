import { stripe } from './config';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getAuthUserId } from '../../../lib/authServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { returnUrl } = req.body || {};
    const authedUserId = await getAuthUserId(req);
    if (!authedUserId) return res.status(401).json({ error: 'Unauthorized' });

    let custId = null;
    if (supabaseAdmin) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', authedUserId)
        .single();
      custId = profile?.stripe_customer_id || null;
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

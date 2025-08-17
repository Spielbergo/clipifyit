import { stripe } from './config';
import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const { email, plan, stripeCustomerId } = req.body || {};
  if (!email || !plan) return res.status(400).json({ error: 'Missing email/plan' });

  try {
    // You may have a profiles table keyed by user.id; here we demo by matching email
    const { data: userData } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single();

    if (!userData) return res.status(404).json({ error: 'User not found' });

    const updates = { plan, stripe_customer_id: stripeCustomerId || null };
    await supabase.from('profiles').update(updates).eq('id', userData.id);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Upsert plan error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

import { stripe } from './config';
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
    if (!supabaseAdmin) return res.status(500).json({ error: 'Server not configured' });

    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
  .eq('id', authedUserId)
      .single();
    if (profErr) return res.status(500).json({ error: 'Profile lookup failed' });
    if (!profile?.stripe_customer_id) return res.status(404).json({ error: 'No Stripe customer on file' });

    const subs = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'all',
      limit: 10,
      expand: [
        'data.default_payment_method',
        'data.latest_invoice',
        'data.items.data.price',
      ],
    });
    if (!subs?.data?.length) return res.status(200).json({ subscription: null });

    // Prefer active/trialing; else most recent
    const preferred = subs.data.find(s => ['active','trialing','past_due','unpaid','incomplete'].includes(s.status)) || subs.data[0];

    // Try to get upcoming invoice (may fail if none)
    let upcomingInvoice = null;
    try {
      const up = await stripe.invoices.retrieveUpcoming({
        customer: profile.stripe_customer_id,
        subscription: preferred.id,
      });
      upcomingInvoice = up ? {
        id: up.id,
        amount_due: up.amount_due,
        amount_remaining: up.amount_remaining,
        currency: up.currency,
        next_payment_attempt: up.next_payment_attempt,
        hosted_invoice_url: up.hosted_invoice_url,
      } : null;
    } catch (_e) {
      // No upcoming invoice; ignore
    }

    const defaultPm = preferred.default_payment_method;
    const pmCard = defaultPm?.card ? {
      brand: defaultPm.card.brand,
      last4: defaultPm.card.last4,
      exp_month: defaultPm.card.exp_month,
      exp_year: defaultPm.card.exp_year,
    } : null;

    const latestInvoice = preferred.latest_invoice ? {
      id: preferred.latest_invoice.id,
      status: preferred.latest_invoice.status,
      amount_paid: preferred.latest_invoice.amount_paid,
      amount_due: preferred.latest_invoice.amount_due,
      currency: preferred.latest_invoice.currency,
      hosted_invoice_url: preferred.latest_invoice.hosted_invoice_url,
    } : null;

    // Fetch last 3 invoices (ignore failures)
    let invoiceHistory = [];
    try {
      const inv = await stripe.invoices.list({ customer: profile.stripe_customer_id, limit: 3 });
      invoiceHistory = (inv?.data || []).map(x => ({
        id: x.id,
        status: x.status,
        number: x.number,
        amount_paid: x.amount_paid,
        amount_due: x.amount_due,
        currency: x.currency,
        hosted_invoice_url: x.hosted_invoice_url,
        created: x.created,
      }));
    } catch (_e) {}

    return res.status(200).json({
      subscription: {
        id: preferred.id,
        customer_id: preferred.customer,
        status: preferred.status,
        cancel_at_period_end: preferred.cancel_at_period_end,
        cancel_at: preferred.cancel_at,
        canceled_at: preferred.canceled_at,
        current_period_start: preferred.current_period_start,
        current_period_end: preferred.current_period_end,
        created: preferred.created,
        trial_start: preferred.trial_start,
        trial_end: preferred.trial_end,
        collection_method: preferred.collection_method,
        items: preferred.items?.data?.map(i => ({
          price_id: i.price?.id,
          nickname: i.price?.nickname,
          unit_amount: i.price?.unit_amount,
          currency: i.price?.currency,
          interval: i.price?.recurring?.interval,
          product_id: i.price?.product,
          // product_name omitted to avoid deep expand issues
        })) || [],
        default_payment_method: pmCard,
        latest_invoice: latestInvoice,
      },
      upcomingInvoice,
      invoiceHistory,
      livemode: !!preferred.livemode,
    });
  } catch (err) {
    console.error('get-subscription error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

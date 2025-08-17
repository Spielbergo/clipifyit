import { buffer } from 'micro';
import { stripe } from './config';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        if (!supabaseAdmin) break;
        {
          const session = event.data.object;
          const stripeCustomerId = session.customer;
          const plan = session.metadata?.plan || null;
          const term = session.metadata?.term || null;
          const email = session.customer_details?.email || session.customer_email || null;
          let resolvedUserId = session.metadata?.supabase_user_id || session.client_reference_id || null;

          // Resolve/create Supabase user if not provided
          if (!resolvedUserId && email) {
            try {
              const { data: existingProfileRows } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('email', email)
                .limit(1);
              if (existingProfileRows && existingProfileRows.length > 0) {
                resolvedUserId = existingProfileRows[0].id;
              } else {
                const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
                  email,
                  email_confirm: true,
                });
                if (created?.user?.id) {
                  resolvedUserId = created.user.id;
                } else if (createErr) {
                  const { data: invited } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
                  if (invited?.user?.id) {
                    resolvedUserId = invited.user.id;
                  }
                }
              }
            } catch (e) {
              console.warn('Supabase user create/find failed:', e?.message || e);
            }
          }

          if (resolvedUserId) {
            await supabaseAdmin
              .from('profiles')
              .upsert({
                id: resolvedUserId,
                plan,
                plan_term: term,
                stripe_customer_id: stripeCustomerId,
                subscription_status: 'active',
                ...(email ? { email } : {}),
              }, { onConflict: 'id' });
          } else if (stripeCustomerId) {
            await supabaseAdmin
              .from('profiles')
              .update({
                plan,
                plan_term: term,
                subscription_status: 'active',
                ...(email ? { email } : {}),
              })
              .eq('stripe_customer_id', stripeCustomerId);
          }
        }
        break;
      case 'invoice.payment_succeeded':
        if (!supabaseAdmin) break;
        {
          const invoice = event.data.object;
          const stripeCustomerId = invoice.customer;
          await supabaseAdmin
            .from('profiles')
            .update({ subscription_status: 'active' })
            .eq('stripe_customer_id', stripeCustomerId);
        }
        break;
      case 'customer.subscription.updated':
        if (!supabaseAdmin) break;
        {
          const sub = event.data.object;
          const status = sub.status; // trialing, active, past_due, canceled, unpaid, incomplete, etc.
          await supabaseAdmin
            .from('profiles')
            .update({ subscription_status: status })
            .eq('stripe_customer_id', sub.customer);
        }
        break;
      case 'customer.subscription.deleted':
        if (!supabaseAdmin) break;
        {
          const sub = event.data.object;
          await supabaseAdmin
            .from('profiles')
            .update({ subscription_status: 'canceled' })
            .eq('stripe_customer_id', sub.customer);
        }
        break;
      default:
        break;
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook handler error', err);
    res.status(500).json({ error: 'Webhook handler error' });
  }
}

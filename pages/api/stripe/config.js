import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export const PRICE_IDS = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY, // e.g. price_...
  PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY, // e.g. price_...
  PRO_PLUS_MONTHLY: process.env.STRIPE_PRICE_PRO_PLUS_MONTHLY, // e.g. price_...
  PRO_PLUS_YEARLY: process.env.STRIPE_PRICE_PRO_PLUS_YEARLY, // e.g. price_...
};

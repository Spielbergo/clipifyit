import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}
if (!serviceKey) {
  // We won't throw here to avoid crashing builds if not set in dev, but server routes will fail if used.
  console.warn('Warning: SUPABASE_SERVICE_ROLE_KEY is not set. Server-side mutations will fail.');
}

export const supabaseAdmin = serviceKey
  ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  : null;

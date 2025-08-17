import { supabaseAdmin } from './supabaseAdmin';

export async function getAuthUserId(req) {
  try {
    const auth = req.headers.authorization || '';
    const parts = auth.split(' ');
    const token = parts.length === 2 && /^Bearer$/i.test(parts[0]) ? parts[1] : null;
    if (!token || !supabaseAdmin) return null;
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

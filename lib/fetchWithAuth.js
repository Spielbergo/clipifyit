import { supabase } from './supabase';

/**
 * fetchWithAuth: wraps window.fetch and injects Supabase Bearer token.
 *
 * Usage:
 *  await fetchWithAuth('/api/secure', { method: 'POST', json: { foo: 'bar' } });
 *  await fetchWithAuth('/api/secure', { method: 'GET' });
 */
export async function fetchWithAuth(input, init = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  const headers = {
    ...(init.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Convenience: if `json` provided, set Content-Type and stringify body
  if (Object.prototype.hasOwnProperty.call(init, 'json')) {
    headers['Content-Type'] = 'application/json';
    const method = init.method || 'POST';
    const body = JSON.stringify(init.json);
    return fetch(input, { ...init, method, headers, body });
  }

  return fetch(input, { ...init, headers });
}

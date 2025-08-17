import { useState } from 'react';
import useSubscription from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuth } from '../lib/fetchWithAuth';

export default function ManageBillingButton({ className }) {
  const { isActive } = useSubscription();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const openPortal = async () => {
    if (!user?.id || !isActive || loading) return;
    try {
      setLoading(true);
  const res = await fetchWithAuth('/api/stripe/create-portal-session', { method: 'POST', json: { returnUrl: window.location.origin + '/app' } });
      const data = await res.json();
      if (data?.url) window.location.href = data.url;
      else alert(data?.error || 'Failed to open billing portal');
    } finally {
      setLoading(false);
    }
  };

  if (!isActive) return null;
  return (
    <button className={className} onClick={openPortal} disabled={loading} aria-disabled={loading}>
      {loading ? 'Opening…' : 'Manage billing'}
    </button>
  );
}

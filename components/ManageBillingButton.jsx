import { useState } from 'react';
import useSubscription from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';

export default function ManageBillingButton({ className }) {
  const { isActive } = useSubscription();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const openPortal = async () => {
    if (!user?.id || !isActive || loading) return;
    try {
      setLoading(true);
      // Resolve customer by email; alternatively pass stripe_customer_id if stored client-side.
      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, customerEmail: user.email, returnUrl: window.location.origin + '/app' }),
      });
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

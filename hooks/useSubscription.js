import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function useSubscription() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ plan: null, plan_term: null, subscription_status: null });

  const fetchStatus = useCallback(async () => {
    if (!user?.id) {
      setData({ plan: null, plan_term: null, subscription_status: null });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: row, error: err } = await supabase
        .from('profiles')
        .select('plan, plan_term, subscription_status')
        .eq('id', user.id)
        .single();
      if (err) throw err;
      setData(row || { plan: null, plan_term: null, subscription_status: null });
    } catch (e) {
      setError(e);
      setData({ plan: null, plan_term: null, subscription_status: null });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const isActive = !!data?.subscription_status && ['active', 'trialing'].includes(data.subscription_status);

  return { loading, error, ...data, isActive, refresh: fetchStatus };
}

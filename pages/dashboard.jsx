import { useState, useEffect } from "react";
import { useRouter } from "next/router";

import { supabase } from "../lib/supabase";
import { fetchWithAuth } from "../lib/fetchWithAuth";
import useSubscription from "../hooks/useSubscription";
import { useAuth } from "../contexts/AuthContext";

import Loader from "../components/Loader.component";
import HeroSection from "../components/HeroSection.component";
import Footer from "../components/Footer.component";
import Modal from "../components/Modal.component";

import styles from "../styles/dashboard.module.css";

export default function Dashboard() {
  const { user, updateProfile, logout } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(user?.displayName || "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const { plan: subPlan, subscription_status, isActive } = useSubscription();
  const [subDetails, setSubDetails] = useState(null);
  const [subLoading, setSubLoading] = useState(false);
  const [subErr, setSubErr] = useState("");

  useEffect(() => {
    if (user === undefined) return;
    if (user === null) {
      // Avoid indefinite spinner if navigation hiccups; then redirect.
      setLoading(false);
      router.replace("/login");
      return;
    }

    // Fetch name from profiles table
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .single();
        setName(data?.name || "");
      } catch (_e) {
        // noop; name remains blank
      } finally {
        setLoading(false);
      }
    })();
    }, [user, router]);

  // Load Stripe subscription details for richer UI
  useEffect(() => {
    if (!user?.id) return;
    let ignore = false;
    (async () => {
      try {
        setSubLoading(true);
        setSubErr("");
  const res = await fetchWithAuth('/api/stripe/get-subscription', { method: 'POST', json: {} });
        const json = await res.json();
        if (!ignore) setSubDetails(json?.subscription ? json : { subscription: null });
      } catch (e) {
        if (!ignore) setSubErr('Failed to load subscription');
      } finally {
        if (!ignore) setSubLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [user?.id]);

    if (loading || user === undefined) {
        return (
            <div className={styles.loadingWrap}>
              <Loader size={48} />
            </div>
        );
    }

    const handleSave = async () => {
        setSaving(true);
        setError("");
        setSuccess("");
        try {
            // Update display name in Supabase Auth
            const { error } = await supabase.auth.updateUser({
            data: { display_name: name }
            });
            if (error) throw error;

            // Update in profiles table as well
            await supabase
            .from("profiles")
            .update({ name })
            .eq("id", user.id);

            setSuccess("Profile updated!");
            setEditing(false);
        } catch (e) {
            setError("Failed to update profile.");
        }
        setSaving(false);
    };

  // Stripe integration
  const startCheckout = async (plan) => {
    const res = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, userId: user?.id || null, term: 'monthly' }),
    });
    const data = await res.json();
    if (data?.url) window.location.href = data.url;
  };
  const openPortal = async () => {
  const res = await fetchWithAuth('/api/stripe/create-portal-session', { method: 'POST', json: { returnUrl: window.location.origin + '/dashboard' } });
    const data = await res.json();
    if (data?.url) window.location.href = data.url;
    else {
      setToastMessage(data?.error || 'Failed to open billing portal');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
  const res = await fetchWithAuth("/api/delete-account", { method: "POST" });
      if (!res.ok) throw new Error('Delete failed');
      // Close modal and show toast before logging out
      setShowDeleteModal(false);
      setToastMessage('Account deleted. Signing out…');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        logout();
      }, 1500);
    } finally {
      setDeleting(false);
    }
  };

  const reloadSubscription = async () => {
    if (!user?.id) return;
    setSubLoading(true);
    try {
  const res = await fetchWithAuth('/api/stripe/get-subscription', { method: 'POST', json: {} });
      const json = await res.json();
      setSubDetails(json?.subscription ? json : { subscription: null });
    } catch (_e) {
      setSubErr('Failed to load subscription');
    } finally {
      setSubLoading(false);
    }
  };

  const changePlan = async (target) => {
    try {
  const res = await fetchWithAuth('/api/stripe/change-plan', { method: 'POST', json: { targetPlan: target } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Plan change failed');
      setToastMessage('Plan update created. If a payment is required, complete it in the portal.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
      reloadSubscription();
    } catch (e) {
      setToastMessage(e.message || 'Plan change failed');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    }
  }; 

  return (
    <>
      <HeroSection
        title="Your Dashboard"
        subtitle="Manage your account, plan, and profile settings."
      />
      <main className={styles.dashboardMain}>
        <div className={styles.card}>
          <h2>Profile</h2>
          <div className={styles.profileRow}>
            <label>Name:</label>
            {editing ? (
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={saving}
              />
            ) : (
              <span>{user?.user_metadata?.display_name || "—"}</span>
            )}
            {editing ? (
              <>
                <button onClick={handleSave} disabled={saving}>Save</button>
                <button onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)}>Edit</button>
            )}
          </div>
          <div className={styles.profileRow}>
            <label>Email:</label>
            <span>{user?.email}</span>
          </div>
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}
        </div>

        <div className={styles.card}>
          <h2>Plan</h2>
          <div className={styles.planRow}>
            <span>Current Plan:</span>
            <span className={styles[`planBadge_${(isActive ? (subPlan || 'pro') : 'free')}`]}>
              {isActive ? ((subPlan || 'pro').toUpperCase()) : 'FREE'}
            </span>
          </div>
          <div className={styles.planRow}>
            <span>Status:</span>
            <span>{subscription_status || 'none'}</span>
          </div>
          <div className={styles.planActions}>
            {!isActive && (
              <button onClick={() => startCheckout('pro')}>Upgrade to Pro</button>
            )}
            {isActive && (
              <>
                <button onClick={openPortal}>Manage Subscription</button>
                {subPlan === 'pro' ? (
                  <button onClick={() => changePlan('proplus')} disabled={subLoading}>Upgrade to Pro+</button>
                ) : (
                  <button onClick={() => changePlan('pro')} disabled={subLoading}>Downgrade to Pro</button>
                )}
                {/* Billing term switcher removed */}
              </>
            )}
          </div>
        </div>

        {/* Billing details */}
        <div className={styles.card}>
          <h2>Billing</h2>
          {subLoading ? (
            <div className={styles.loadingInline}><Loader size={24} /></div>
          ) : !subDetails?.subscription ? (
            <p>No active subscription found.</p>
          ) : (
            <div className={styles.billingGrid}>
              <div>
                <label>Subscription ID</label>
                <div>{subDetails.subscription.id}</div>
              </div>
              <div>
                <label>Status</label>
                <div>{subDetails.subscription.status}</div>
              </div>
              <div>
                <label>Renews</label>
                <div>{subDetails.subscription.cancel_at_period_end ? 'Will cancel at period end' : 'Auto-renew'}</div>
              </div>
              <div>
                <label>Current period</label>
                <div>
                  {new Date(subDetails.subscription.current_period_start * 1000).toLocaleString()} → {new Date(subDetails.subscription.current_period_end * 1000).toLocaleString()}
                </div>
              </div>
              {subDetails.subscription.trial_start || subDetails.subscription.trial_end ? (
                <div>
                  <label>Trial</label>
                  <div>
                    {subDetails.subscription.trial_start ? `From ${new Date(subDetails.subscription.trial_start * 1000).toLocaleDateString()}` : ''}
                    {subDetails.subscription.trial_end ? ` to ${new Date(subDetails.subscription.trial_end * 1000).toLocaleDateString()}` : ''}
                  </div>
                </div>
              ) : null}
              {subDetails.upcomingInvoice?.next_payment_attempt ? (
                <div>
                  <label>Next charge on</label>
                  <div>{new Date(subDetails.upcomingInvoice.next_payment_attempt * 1000).toLocaleString()}</div>
                </div>
              ) : (
                <div>
                  <label>Next billing date</label>
                  <div>{new Date(subDetails.subscription.current_period_end * 1000).toLocaleString()}</div>
                </div>
              )}
              {subDetails.subscription.items?.length ? (
                <div className={styles.span2}>
                  <label>Items</label>
                  <ul className={styles.listBare}>
                    {subDetails.subscription.items.map((i, idx) => (
                      <li key={idx}>
                        {(i.product_name || i.nickname || i.price_id)} — {i.interval} — {(i.unit_amount != null ? (i.unit_amount/100).toLocaleString(undefined,{style:'currency',currency:i.currency?.toUpperCase?.()||'USD'}) : '')}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {subDetails.subscription.default_payment_method ? (
                <div>
                  <label>Payment method</label>
                  <div>
                    {subDetails.subscription.default_payment_method.brand?.toUpperCase()} •••• {subDetails.subscription.default_payment_method.last4} (exp {subDetails.subscription.default_payment_method.exp_month}/{subDetails.subscription.default_payment_method.exp_year})
                    {isActive ? (
                      <> — <a href="#" onClick={(e) => { e.preventDefault(); openPortal(); }}>Change</a></>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {subDetails.subscription.latest_invoice ? (
                <div>
                  <label>Last invoice</label>
                  <div>
                    {(subDetails.subscription.latest_invoice.amount_paid/100).toLocaleString(undefined,{style:'currency',currency:subDetails.subscription.latest_invoice.currency?.toUpperCase?.()||'USD'})}
                    {subDetails.subscription.latest_invoice.hosted_invoice_url ? (
                      <> — <a href={subDetails.subscription.latest_invoice.hosted_invoice_url} target="_blank" rel="noreferrer">View</a></>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {subDetails.upcomingInvoice ? (
                <div>
                  <label>Next invoice</label>
                  <div>
                    {(subDetails.upcomingInvoice.amount_due/100).toLocaleString(undefined,{style:'currency',currency:subDetails.upcomingInvoice.currency?.toUpperCase?.()||'USD'})}
                    {subDetails.upcomingInvoice.hosted_invoice_url ? (
                      <> — <a href={subDetails.upcomingInvoice.hosted_invoice_url} target="_blank" rel="noreferrer">Preview</a></>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {subDetails.invoiceHistory?.length ? (
                <div className={styles.span2}>
                  <label>Invoice history</label>
                  <ul className={styles.listBare}>
                    {subDetails.invoiceHistory.map(inv => (
                      <li key={inv.id}>
                        {new Date(inv.created*1000).toLocaleDateString()} — {(inv.amount_due/100).toLocaleString(undefined,{style:'currency',currency:inv.currency?.toUpperCase?.()||'USD'})}
                        {inv.hosted_invoice_url ? (
                          <> — <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer">View</a></>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
          {subErr && <div className={styles.error}>{subErr}</div>}
          {isActive && (
            <div className={styles.planActions}>
              <button onClick={openPortal}>Manage Subscription</button>
            </div>
          )}
        </div>

        <div className={styles.card}>
          <h2>Danger Zone</h2>
          <button className={styles.deleteBtn} onClick={handleDelete}>
            Delete My Account
          </button>
        </div>
        <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
          <h3>Delete account?</h3>
          <p>This will permanently delete your account and all associated data. This action cannot be undone.</p>
          <div className={styles.planActions}>
            <button onClick={() => setShowDeleteModal(false)} disabled={deleting}>Cancel</button>
            <button className={styles.deleteBtn} onClick={confirmDelete} disabled={deleting} aria-disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
        {showToast && (
          <div className={styles.toast} role="status" aria-live="polite">{toastMessage}</div>
        )}
      </main>
      <Footer />
    </>
  );
}
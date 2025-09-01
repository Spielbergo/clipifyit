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
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [subDetails, setSubDetails] = useState(null);
  const [subLoading, setSubLoading] = useState(false);
  const [subErr, setSubErr] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);
  // Export filters
  const [exportProjects, setExportProjects] = useState([]);
  const [selectedExportProjectId, setSelectedExportProjectId] = useState('');
  const [exportFolders, setExportFolders] = useState([]);
  const [selectedExportFolderId, setSelectedExportFolderId] = useState('');

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

  // Track online/offline to show an Offline badge
  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    if (typeof window !== 'undefined') {
      window.addEventListener('online', on);
      window.addEventListener('offline', off);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', on);
        window.removeEventListener('offline', off);
      }
    };
  }, []);

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

  // Load projects list for export filters (must be before early return)
  useEffect(() => {
    if (!user?.id) return;
    let ignore = false;
    (async () => {
      const { data } = await supabase
        .from('projects')
        .select('id,name,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!ignore) setExportProjects(data || []);
    })();
    return () => { ignore = true; };
  }, [user?.id]);

  // Load folders when a project is selected (must be before early return)
  useEffect(() => {
    if (!user?.id || !selectedExportProjectId) { setExportFolders([]); return; }
    let ignore = false;
    (async () => {
      const { data } = await supabase
        .from('folders')
        .select('id,name,project_id,created_at')
        .eq('project_id', selectedExportProjectId)
        .order('created_at', { ascending: true });
      if (!ignore) setExportFolders(data || []);
    })();
    return () => { ignore = true; };
  }, [user?.id, selectedExportProjectId]);

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
  const res = await fetchWithAuth('/api/stripe/create-checkout-session', { method: 'POST', json: { plan, term: 'monthly' } });
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

  

  // Shared loader for export data
  const loadExportData = async ({ projectId, folderId } = {}) => {
    // 1) Fetch projects (all or one)
    let projQuery = supabase
      .from('projects')
      .select('id,name,created_at')
      .eq('user_id', user.id);
    if (projectId) projQuery = projQuery.eq('id', projectId);
    projQuery = projQuery.order('created_at', { ascending: false });
    const { data: projects, error: projErr } = await projQuery;
    if (projErr) throw projErr;
    if (!projects || projects.length === 0) {
      return { projects: [], folders: [], items: [] };
    }
    const projectIds = projects.map(p => p.id);
    // 2) Folders
    let foldQuery = supabase
      .from('folders')
      .select('id,project_id,name,created_at');
    if (projectIds.length === 1) foldQuery = foldQuery.eq('project_id', projectIds[0]);
    else foldQuery = foldQuery.in('project_id', projectIds);
    const { data: folders, error: foldErr } = await foldQuery;
    if (foldErr) throw foldErr;
    // 3) Items (wide select with graceful fallback)
    let items = [];
    let itemsErr = null;
    {
      let q = supabase
        .from('clipboard_items')
        .select('id,project_id,folder_id,text,name,label_color,completed,order,created_at,updated_at');
      if (projectIds.length === 1) q = q.eq('project_id', projectIds[0]);
      else q = q.in('project_id', projectIds);
      if (folderId) {
        if (folderId === '__NO_FOLDER__') q = q.is('folder_id', null);
        else q = q.eq('folder_id', folderId);
      }
      q = q.order('order', { ascending: false, nullsLast: true });
      const { data, error } = await q;
      items = data || [];
      itemsErr = error || null;
    }
    if (itemsErr) {
      let q2 = supabase
        .from('clipboard_items')
        .select('id,project_id,folder_id,text,order,created_at');
      if (projectIds.length === 1) q2 = q2.eq('project_id', projectIds[0]);
      else q2 = q2.in('project_id', projectIds);
      if (folderId) {
        if (folderId === '__NO_FOLDER__') q2 = q2.is('folder_id', null);
        else q2 = q2.eq('folder_id', folderId);
      }
      q2 = q2.order('order', { ascending: false, nullsLast: true });
      const { data, error } = await q2;
      if (error) throw error;
      items = data || [];
    }
    return { projects, folders: folders || [], items };
  };

  // Export all clipboard items to an Excel workbook with one sheet per project and per folder
  const exportAllToExcel = async () => {
    if (!user?.id) return;
    try {
      setExporting(true);
      setToastMessage('Preparing export…');
      setShowToast(true);
      const projectId = selectedExportProjectId || undefined;
      const folderId = selectedExportFolderId || undefined;
      const { projects, folders, items } = await loadExportData({ projectId, folderId });
      if (!projects.length) {
        setToastMessage('No projects found to export');
        setTimeout(() => setShowToast(false), 2000);
        return;
      }

      // Build workbook on client
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const usedNames = new Set();
      const sanitize = (name) => {
        let n = (name || 'Sheet').replace(/[\\\\\\/\\:?*\\[\\]]/g, ' ').trim();
        if (n.length > 31) n = n.slice(0, 31).trim();
        let base = n || 'Sheet';
        let candidate = base;
        let i = 2;
        while (usedNames.has(candidate)) {
          const suffix = ` (${i++})`;
          candidate = (base.slice(0, Math.max(0, 31 - suffix.length)) + suffix).trim();
        }
        usedNames.add(candidate);
        return candidate;
      };
      const addSheet = (sheetName, rows) => {
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, sanitize(sheetName));
      };

      for (const p of projects) {
        const pid = p.id;
        const pName = p.name || 'Untitled Project';
        const wantOnlyNoFolder = !!projectId && folderId === '__NO_FOLDER__';
        const wantOnlySpecificFolder = !!projectId && folderId && folderId !== '__NO_FOLDER__';

        if (!wantOnlySpecificFolder) {
          // Include No Folder sheet when not explicitly targeting a specific folder
          const topItems = (items || []).filter(it => it.project_id === pid && !it.folder_id);
          const topRows = topItems.map(it => ({
            Text: it.text || '',
            Name: it.name || '',
            'Label Color': it.label_color || '',
            Completed: it.completed ? 'Yes' : '',
            'Created At': it.created_at ? new Date(it.created_at).toLocaleString() : '',
            Order: it.order != null ? it.order : ''
          }));
          addSheet(`${pName} — No Folder`, topRows);
        }

        // Folder sheets
        const pFolders = (folders || []).filter(f => f.project_id === pid);
        for (const f of pFolders) {
          if (wantOnlyNoFolder) continue; // skip all folders when only No Folder requested
          if (wantOnlySpecificFolder && f.id !== folderId) continue; // only the selected folder
          const fItems = (items || []).filter(it => it.folder_id === f.id);
          const rows = fItems.map(it => ({
            Text: it.text || '',
            Name: it.name || '',
            'Label Color': it.label_color || '',
            Completed: it.completed ? 'Yes' : '',
            'Created At': it.created_at ? new Date(it.created_at).toLocaleString() : '',
            Order: it.order != null ? it.order : ''
          }));
          addSheet(`${pName} — ${f.name || 'Folder'}`, rows);
        }
      }

      const ts = new Date();
      const y = ts.getFullYear();
      const m = String(ts.getMonth() + 1).padStart(2, '0');
      const d = String(ts.getDate()).padStart(2, '0');
      const fileName = `clipifyit-export-${y}${m}${d}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setToastMessage('Export created');
      setTimeout(() => setShowToast(false), 2000);
    } catch (e) {
      console.error('Export failed', e);
      setToastMessage('Export failed');
      setTimeout(() => setShowToast(false), 2500);
    } finally {
      setExporting(false);
    }
  };

  // Export a flat CSV with Project and Folder columns
  const exportAllToCSV = async () => {
    if (!user?.id) return;
    try {
      setExportingCsv(true);
      setToastMessage('Preparing CSV…');
      setShowToast(true);
      const projectId = selectedExportProjectId || undefined;
      const folderId = selectedExportFolderId || undefined;
      const { projects, folders, items } = await loadExportData({ projectId, folderId });
      if (!projects.length) {
        setToastMessage('No projects found to export');
        setTimeout(() => setShowToast(false), 2000);
        return;
      }
      const projectById = Object.fromEntries((projects || []).map(p => [p.id, p]));
      const folderById = Object.fromEntries((folders || []).map(f => [f.id, f]));

      const headers = ['Project', 'Folder', 'Text', 'Name', 'Label Color', 'Completed', 'Created At', 'Order'];
      const escape = (v) => {
        const s = (v == null ? '' : String(v));
        if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
        return s;
      };
      const lines = [headers.join(',')];
      for (const it of (items || [])) {
        const pName = projectById[it.project_id]?.name || '';
        const fName = it.folder_id ? (folderById[it.folder_id]?.name || '') : '';
        const row = [
          escape(pName),
          escape(fName),
          escape(it.text || ''),
          escape(it.name || ''),
          escape(it.label_color || ''),
          escape(it.completed ? 'Yes' : ''),
          escape(it.created_at ? new Date(it.created_at).toLocaleString() : ''),
          escape(it.order != null ? it.order : '')
        ];
        lines.push(row.join(','));
      }
      const csv = lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const ts = new Date();
      const y = ts.getFullYear();
      const m = String(ts.getMonth() + 1).padStart(2, '0');
      const d = String(ts.getDate()).padStart(2, '0');
      const a = document.createElement('a');
      a.href = url;
      a.download = `clipifyit-export-${y}${m}${d}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setToastMessage('CSV exported');
      setTimeout(() => setShowToast(false), 2000);
    } catch (e) {
      console.error('CSV export failed', e);
      setToastMessage('CSV export failed');
      setTimeout(() => setShowToast(false), 2500);
    } finally {
      setExportingCsv(false);
    }
  };

  // Export JSON (filtered by project/folder, if selected)
  const exportAllToJSON = async () => {
    if (!user?.id) return;
    try {
      setExportingJson(true);
      setToastMessage('Preparing JSON…');
      setShowToast(true);
      const projectId = selectedExportProjectId || undefined;
      const folderId = selectedExportFolderId || undefined;
      const payload = await loadExportData({ projectId, folderId });
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const ts = new Date();
      const y = ts.getFullYear();
      const m = String(ts.getMonth() + 1).padStart(2, '0');
      const d = String(ts.getDate()).padStart(2, '0');
      const a = document.createElement('a');
      a.href = url;
      a.download = `clipifyit-export-${y}${m}${d}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToastMessage('JSON exported');
      setTimeout(() => setShowToast(false), 2000);
    } catch (e) {
      console.error('JSON export failed', e);
      setToastMessage('JSON export failed');
      setTimeout(() => setShowToast(false), 2500);
    } finally {
      setExportingJson(false);
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
            {isOffline && (
              <span style={{ marginLeft: 8 }} className={styles.planBadge_offline}>OFFLINE</span>
            )}
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

        {/* Data Export */}
        <div className={styles.card}>
          <h2>Export</h2>
          <p>Download your clipboard items grouped by project and folder as an Excel workbook or CSV. Optionally filter by project/folder.</p>
          <div className={styles.planActions} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select
                value={selectedExportProjectId}
                onChange={(e) => { setSelectedExportProjectId(e.target.value); setSelectedExportFolderId(''); }}
                title="Project filter"
              >
                <option value="">All projects</option>
                {exportProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name || 'Untitled Project'}</option>
                ))}
              </select>
              <select
                value={selectedExportFolderId}
                onChange={(e) => setSelectedExportFolderId(e.target.value)}
                disabled={!selectedExportProjectId}
                title="Folder filter"
              >
                <option value="">All folders</option>
                <option value="__NO_FOLDER__">No folder items</option>
                {exportFolders.map(f => (
                  <option key={f.id} value={f.id}>{f.name || 'Folder'}</option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.planActions}>
            <button onClick={exportAllToExcel} disabled={exporting} aria-disabled={exporting}>
              {exporting ? 'Exporting…' : 'Export (.xlsx, multi-tab)'}
            </button>
            <button onClick={exportAllToCSV} disabled={exportingCsv} aria-disabled={exportingCsv}>
              {exportingCsv ? 'Exporting…' : 'Export CSV (flat)'}
            </button>
            <button onClick={exportAllToJSON} disabled={exportingJson} aria-disabled={exportingJson}>
              {exportingJson ? 'Exporting…' : 'Export JSON'}
            </button>
          </div>
          <div className={styles.note} style={{ color: '#999', fontSize: 13, marginTop: 6 }}>
            Note: CSV files don’t support tabs. Use the Excel export to get one sheet per project and folder.
          </div>
        </div>

        <div className={styles.card}>
          <h2>Danger Zone</h2>
          <button className={styles.deleteBtn} onClick={handleDelete}>
            Delete My Account
          </button>
        </div>
  <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} onPrimary={confirmDelete}>
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
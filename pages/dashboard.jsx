import { useState, useEffect } from "react";
import { useRouter } from "next/router";

import { useAuth } from "../contexts/AuthContext";

import Loader from "../components/Loader.component";
import HeroSection from "../components/HeroSection.component";
import Footer from "../components/Footer.component";

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
  // Simulate plan for demo; replace with real user.plan <<<<<<<<<<<<<<<<<<<<<
  const plan = user?.plan || "free"; // "free", "pro", "proplus"

  useEffect(() => {
    // Wait until user is loaded (undefined means still loading)
    if (user === undefined) return;
    if (user === null) {
        router.replace("/login");
    } else {
        setName(user.displayName || "");
        setLoading(false);
    }
    }, [user, router]);

    if (loading || user === undefined) {
    return (
        <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
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

  // Stripe integration: these would redirect to your Stripe customer portal or checkout
  const handleUpgrade = () => {
    // TODO: Integrate with Stripe checkout for upgrade
    window.location.href = "/api/stripe/upgrade";
  };
  const handleDowngrade = () => {
    // TODO: Integrate with Stripe customer portal for downgrade/cancel
    window.location.href = "/api/stripe/portal";
  };
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
    // TODO: Call your backend to delete the user and all data
    await fetch("/api/delete-account", { method: "POST" });
    logout();
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
            <span className={styles[`planBadge_${plan}`]}>
              {plan === "proplus" ? "PRO+" : plan.toUpperCase()}
            </span>
          </div>
          <div className={styles.planActions}>
            {plan === "free" && (
              <button onClick={handleUpgrade}>Upgrade to Pro</button>
            )}
            {plan === "pro" && (
              <>
                <button onClick={handleUpgrade}>Upgrade to Pro+</button>
                <button onClick={handleDowngrade}>Cancel or Downgrade</button>
              </>
            )}
            {plan === "proplus" && (
              <button onClick={handleDowngrade}>Manage Subscription</button>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <h2>Danger Zone</h2>
          <button className={styles.deleteBtn} onClick={handleDelete}>
            Delete My Account
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
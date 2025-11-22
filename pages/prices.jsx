import React, { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/router';
import { useAuth } from "../contexts/AuthContext";
import { fetchWithAuth } from "../lib/fetchWithAuth";

import plans from '../data/prices';

import HeroSection from "../components/HeroSection.component";
import Testimonials from "../components/Testimonials.component";
import FeatureComparisonTable from "../components/ComparisonTable.component";
import CTASection from "../components/CTASection.component";
import Footer from '../components/Footer.component';

import styles from "../styles/prices.module.css";

async function startCheckout(kind, term, userId) {
  // If logged in, send Authorization and let server derive user
  const useAuth = !!userId;
  const res = useAuth
    ? await fetchWithAuth('/api/stripe/create-checkout-session', { method: 'POST', json: { plan: kind, term } })
    : await fetch('/api/stripe/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: kind, term }) });
  const data = await res.json();
  if (data?.url) {
    window.location.href = data.url;
  } else {
    const msg = data?.error ? `Failed to start checkout: ${data.error}` : 'Failed to start checkout';
    alert(msg);
  }
}

const Prices = () => {
  const [term, setTerm] = useState('monthly');
  const { user } = useAuth();
  const router = useRouter();
  const startedRef = useRef(false);
  // Pricing model: default monthly shown; Yearly = ~2 months free (pay for 10)
  const MONTHS_FREE_FOR_YEARLY = 2;
  const savingsPercent = Math.round((MONTHS_FREE_FOR_YEARLY / 12) * 100);

  const formatUSD = (n) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

  // Auto-start checkout if redirected from login with plan/term
  useEffect(() => {
    if (!user?.id) return;
    const { plan, term: qTerm } = router.query || {};
    const planKey = typeof plan === 'string' ? plan.toLowerCase() : '';
    const termKey = typeof qTerm === 'string' ? qTerm.toLowerCase() : 'monthly';
    if (!planKey) return;
    if (startedRef.current) return;
    if (!['pro','proplus'].includes(planKey)) return;
    startedRef.current = true;
    // Clear any pending marker to avoid loops
    try { localStorage.removeItem('pendingCheckout'); } catch {}
    startCheckout(planKey, termKey === 'yearly' ? 'yearly' : 'monthly', user.id);
  }, [user?.id, router.query]);

  const handleCheckoutClick = (kind) => {
    if (!user?.id) {
      try {
        localStorage.setItem('pendingCheckout', JSON.stringify({ plan: kind, term }));
      } catch {}
      window.location.href = '/login';
      return;
    }
    startCheckout(kind, term, user.id);
  };

  return (
    <>
    <HeroSection
      title="Choose Your Plan"
      subtitle="Simple, transparent pricing. No hidden fees. Upgrade, downgrade, or cancel anytime."
    />
    <main>
      <section className={styles.pricing_page__section}>
        <div className={`${styles.blob} ${styles.blobA}`}></div>
        <div className={`${styles.blob} ${styles.blobB}`}></div>
        <div className={styles.pricingPage}>
          {/* <h1 className={styles.heading}>Choose Your Plan</h1> */}

          <div className={styles.termToggle}>
            <button
              className={`${styles.toggleBtn} ${term === 'monthly' ? styles.active : ''}`}
              onClick={() => setTerm('monthly')}
              aria-pressed={term === 'monthly'}
            >
              Monthly
            </button>
            <button
              className={`${styles.toggleBtn} ${term === 'yearly' ? styles.active : ''}`}
              onClick={() => setTerm('yearly')}
              aria-pressed={term === 'yearly'}
            >
              Yearly
            </button>
          </div>

          {/* Savings messaging */}
          {term === 'yearly' ? (
            <div className={styles.savingsCallout}>
              <strong>Save about {savingsPercent}%</strong> with yearly billing (that’s roughly 2 months free)
            </div>
          ) : (
            <div className={styles.savingsNote}>
              Tip: Switch to Yearly to save about {savingsPercent}% (~2 months free)
            </div>
          )}

          <div className={styles.pricingGrid}>
            {plans.map((plan) => {
              // Derive dynamic pricing per term from base monthly price in data
              const baseMonthly = parseFloat(String(plan.price).replace(/[^0-9.]/g, '')) || 0;
              let displayPrice = plan.price;
              let periodLabel = plan.period;
              let subNote = '';
              if (baseMonthly > 0) {
                if (term === 'monthly') {
                  displayPrice = formatUSD(baseMonthly);
                  periodLabel = '/mo';
                } else {
                  const yearlyTotal = baseMonthly * (12 - MONTHS_FREE_FOR_YEARLY);
                  const eqMonthly = yearlyTotal / 12;
                  displayPrice = formatUSD(yearlyTotal);
                  periodLabel = '/yr';
                  subNote = `≈ ${formatUSD(eqMonthly)}/mo billed yearly`;
                }
              }
              return (
              <div
                key={plan.name}
                className={`${styles.card} ${plan.highlight ? styles.highlight : ""}`}
              >
                <h2 className={styles.planName}>{plan.name}</h2>
                <div className={styles.priceRow}>
                  <span className={styles.price}>{displayPrice}</span>
                  <span className={styles.period}>{periodLabel}</span>
                </div>
                {subNote ? (
                  <div className={styles.subNote}>{subNote} — save ~{savingsPercent}%</div>
                ) : null}
                <ul className={styles.features}>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                {plan.button.checkout ? (
                  <button
                    className={`${styles.button} ${styles[plan.button.variant]}`}
                    onClick={() => handleCheckoutClick(
                      plan.button.link === 'checkout:pro' ? 'pro' : 'proplus'
                    )}
                  >
                    {plan.button.text}
                  </button>
                ) : (
                  <a
                    href={plan.button.link}
                    className={`${styles.button} ${styles[plan.button.variant]}`}
                  >
                    {plan.button.text}
                  </a>
                )}
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <Testimonials />

      {/* Feature Comparison Table */}
      <FeatureComparisonTable />

      {/* Call to Action Section */}
      <CTASection />
    </main>
    
    {/* Footer */}
    <Footer />
    </>
  );
};

export default Prices;
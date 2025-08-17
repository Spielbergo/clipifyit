import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

import plans from '../data/prices';

import HeroSection from "../components/HeroSection.component";
import Testimonials from "../components/Testimonials.component";
import FeatureComparisonTable from "../components/ComparisonTable.component";
import CTASection from "../components/CTASection.component";
import Footer from '../components/Footer.component';

import styles from "../styles/prices.module.css";

async function startCheckout(kind, term, userId) {
  const res = await fetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ plan: kind, term, userId }),
  });
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
          <h1 className={styles.heading}>Choose Your Plan</h1>

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

          <div className={styles.pricingGrid}>
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`${styles.card} ${plan.highlight ? styles.highlight : ""}`}
              >
                <h2 className={styles.planName}>{plan.name}</h2>
                <div className={styles.priceRow}>
                  <span className={styles.price}>{plan.price}</span>
                  <span className={styles.period}>{plan.period}</span>
                </div>
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
            ))}
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
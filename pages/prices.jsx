import React from "react";

import plans from '../data/prices';

import HeroSection from "../components/HeroSection.component";
import Testimonials from "../components/Testimonials.component";
import FeatureComparisonTable from "../components/ComparisonTable.component";
import Footer from '../components/Footer.component';

import styles from "../styles/prices.module.css";

const Prices = () => (
  <>
  <HeroSection
    title="Choose Your Plan"
    subtitle="Simple, transparent pricing. No hidden fees. Upgrade, downgrade, or cancel anytime."
  />
  <main>
    <section className={styles.pricing_page__section}>
      <div className={styles.pricingPage}>
        <h1 className={styles.heading}>Choose Your Plan</h1>
        <div className={styles.pricingGrid}>
          {plans.map((plan, idx) => (
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
              <a
                href={plan.button.link}
                className={`${styles.button} ${styles[plan.button.variant]}`}
              >
                {plan.button.text}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Testimonials Section */}
    <Testimonials />

    {/* Feature Comparison Table */}
    <FeatureComparisonTable />
  </main>
  
  {/* Footer */}
  <Footer />
  </>
);

export default Prices;
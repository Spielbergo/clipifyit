import React from "react";

import plans from '../data/prices';

import HeroSection from "../components/HeroSection.component";
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

    {/* Feature Comparison Table */}
    <section className={styles.pricing_page__section}>
      <div className={styles.comparisonWrapper}>
        <h2 className={styles.comparisonTitle}>Compare Features</h2>
        <table className={styles.comparisonTable}>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Free</th>
              <th>Pro</th>
              <th className={styles.proPlusCol}>Pro Plus<br /><span className={styles.comingSoon}>Coming Soon</span></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Clipboard History</td>
              <td>Limited</td>
              <td><span className={styles.check}></span> Unlimited</td>
              <td><span className={styles.check}></span> Unlimited + AI Search</td>
            </tr>
            <tr>
              <td>Instant Search</td>
              <td><span className={styles.check}>✔</span></td>
              <td><span className={styles.check}>✔</span></td>
              <td><span className={styles.check}></span> + Smart Suggestions</td>
            </tr>
            <tr>
              <td>Folders & Organization</td>
              <td></td>
              <td><span className={styles.check}>✔</span></td>
              <td><span className={styles.check}></span> + Nested Folders</td>
            </tr>
            <tr>
              <td>Cloud Sync</td>
              <td></td>
              <td><span className={styles.check}>✔</span></td>
              <td><span className={styles.check}></span> + Multi-device</td>
            </tr>
            <tr>
              <td>Export to CSV/Text</td>
              <td><span className={styles.check}>✔</span></td>
              <td><span className={styles.check}>✔</span></td>
              <td><span className={styles.check}>✔</span></td>
            </tr>
            <tr>
              <td>Priority Support</td>
              <td></td>
              <td><span className={styles.check}>✔</span></td>
              <td><span className={styles.check}></span> + 24/7 Chat</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
  
  {/* Footer */}
  <Footer />
  </>
);

export default Prices;
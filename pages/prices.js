import React from "react";
import styles from "../styles/prices.module.css";

const plans = [
  {
    name: "Free Forever",
    price: "$0",
    period: "",
    features: [
      "Unlimited local clipboard history",
      "Basic search",
      "Manual backup/restore",
      "No login required",
    ],
    button: { text: "Get Started", link: "/app", variant: "primary" },
    highlight: false,
  },
  {
    name: "Pro",
    price: "$0.99",
    period: "/mo",
    features: [
      "Cloud clipboard sync",
      "Access anywhere",
      "Priority support",
      "All Free features",
    ],
    button: { text: "Go Pro", link: "/app", variant: "accent" },
    highlight: true,
  },
  {
    name: "Pro Plus",
    price: "$1.99",
    period: "/mo",
    features: [
      "All Pro features",
      "Unlimited history",
      'Paste Images & Files',
      "Team sharing (coming soon)",
      "Advanced analytics",
      "Early access to new features",
    ],
    button: { text: "Go Pro Plus", link: "/app", variant: "secondary" },
    highlight: false,
  },
];

const Prices = () => (
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
);

export default Prices;
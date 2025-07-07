import Link from 'next/link';

import styles from './cta-section.module.css';

export default function CTASection({
  title = "Ready to supercharge your clipboard?",
  subtitle = (
    <>
      Try Clipify It free, or unlock Pro for just <span className={styles.proPrice}>$0.99/mo</span>!
    </>
  ),
  primaryText = "Try Free",
  primaryHref = "/app",
  secondaryText = "Upgrade to Pro",
  secondaryHref = "/signup"
}) {
  return (
    <section className={styles.ctaSection}>
      <div className={styles.ctaContent}>
        <h2 className={styles.ctaTitle}>{title}</h2>
        <p className={styles.ctaSubtitle}>{subtitle}</p>
        <div className={styles.ctaButtons}>
          <Link href={primaryHref}>
            <button className={styles.ctaBtnPrimary}>{primaryText}</button>
          </Link>
          <Link href={secondaryHref}>
            <button className={styles.ctaBtnSecondary}>{secondaryText}</button>
          </Link>
        </div>
      </div>
    </section>
  );
}
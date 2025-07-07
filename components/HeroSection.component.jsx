import styles from './hero-section.module.css';

export default function HeroSection({ title, subtitle, children }) {
  return (
    <section className={styles.Hero}>
      <h1 className={styles.HeroTitle}>{title}</h1>
      <p className={styles.HeroSubtitle}>{subtitle}</p>
      {children}
    </section>
  );
}

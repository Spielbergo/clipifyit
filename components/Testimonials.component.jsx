import styles from './testimonials.module.css';

const testimonials = [
  {
    text: "Clipify It has completely changed how I work. I never lose anything I copy, and searching old clips is instant!",
    user: "— Alex P.",
  },
  {
    text: "The Pro version is a no-brainer. Cloud sync and unlimited history for less than a coffee a month!",
    user: "— Jamie L.",
  },
  {
    text: "I love how simple and fast Clipify It is. Organizing my clipboard has never been easier.",
    user: "— Morgan S.",
  },
];

export default function Testimonials() {
  return (
    <section className={styles.testimonials}>
      <h2 className={styles.sectionTitle}>
        What Users Are Saying
      </h2>
      <div className={styles.testimonialGrid}>
        {testimonials.map((t, i) => (
          <div className={styles.testimonialCard} key={i}>
            <span className={styles.quoteIcon}>“</span>
            <div className={styles.testimonialText}>{t.text}</div>
            <div className={styles.testimonialUser}>{t.user}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
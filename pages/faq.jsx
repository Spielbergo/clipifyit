import { useState } from "react";

import Link from "next/link";

import HeroSection from "../components/HeroSection.component";
import Footer from '../components/Footer.component';

import styles from "../styles/faq.module.css";

const faqs = [
  {
    question: "Is Clipify It really free?",
    answer: "Yes! You can use the core features for free. Upgrade to Pro for unlimited history, cloud sync, and more.",
  },
  {
    question: "What platforms are supported?",
    answer: "Clipify It works in your browser on Windows, Mac, and Linux. Mobile support is coming soon!",
  },
  {
    question: "How is my data stored?",
    answer: "Your clipboard data is stored locally in your browser. Pro users can sync securely to the cloud.",
  },
  {
    question: "Can I export my clipboard history?",
    answer: "Yes! You can export your clipboard items to CSV or plain text anytime.",
  },
  {
    question: "How do I upgrade to Pro?",
    answer: "Just click 'Upgrade to Pro' anywhere on the site and follow the steps. You can cancel anytime.",
  },
];

function FAQItem({ question, answer, idx }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={styles.faqItem + (open ? " " + styles.faqOpen : "")}
      onClick={() => setOpen((v) => !v)}
      tabIndex={0}
      role="button"
      aria-expanded={open}
      aria-controls={`faq-content-${idx}`}
    >
      <div className={styles.faqQuestion}>
        <span className={styles.faqIcon}>{open ? "−" : "+"}</span>
        {question}
      </div>
      <div
        className={styles.faqAnswer}
        id={`faq-content-${idx}`}
        style={{ maxHeight: open ? 300 : 0 }}
      >
        {answer}
      </div>
    </div>
  );
}



export default function FAQPage() {
  return (
    <>
        <HeroSection
            title="Frequently Asked Questions"
            subtitle={
            <>
                Everything you need to know about Clipify It.<br />
                Can’t find your answer?{" "}
                <Link href="/contact" className={styles.faqHeroLink}>
                Contact us
                </Link>
                .
            </>
            }
        />
        <main>
            {/* FAQ Section */}
            <section className={styles.faqSection}>
                <div className={styles.faqList}>
                {faqs.map((faq, idx) => (
                    <FAQItem key={idx} idx={idx} {...faq} />
                ))}
                </div>
            </section>
    
            {/* Footer */}
            <Footer />
        </main>
    </>
  );
}
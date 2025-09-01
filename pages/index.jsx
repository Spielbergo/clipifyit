import Link from 'next/link';

import CTASection from '../components/CTASection.component';
import Testimonials from '../components/Testimonials.component';
import Footer from '../components/Footer.component';

import styles from '../styles/home.module.css';

export default function Home() {
  return (
    <main className={styles.page}>
      {/* HERO */}
      <section className={styles.heroModern}>
        <div className={styles.heroBg}>
          <div className={styles.gridOverlay} />
          <span className={`${styles.blob} ${styles.blobOne}`} />
          <span className={`${styles.blob} ${styles.blobTwo}`} />
          <span className={`${styles.blob} ${styles.blobThree}`} />
        </div>

        <div className={styles.heroGrid}>
          <div className={styles.heroContent}>
            <div className={styles.brandRow}>
              {/* Inline logomark */}
              <svg className={styles.logoMark} viewBox="0 0 48 48" aria-hidden="true">
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#4fc3f7" />
                    <stop offset="100%" stopColor="#1976d2" />
                  </linearGradient>
                </defs>
                <rect x="4" y="6" width="40" height="30" rx="8" fill="url(#g1)" />
                <rect x="10" y="12" width="28" height="18" rx="4" fill="#0b1020" opacity="0.95" />
                <path d="M16 18h16M16 22h10" stroke="#78d1ff" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="38" cy="37" r="6" fill="#0b1020" />
                <path d="M36 37l2 2 4-4" stroke="#4fc3f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className={styles.brandText}>
                <div className={styles.brandTitle}>Clipify It</div>
                <div className={styles.brandTag}>Your clipboard companion</div>
              </div>
            </div>

            <h1 className={styles.heroTitle}>Organize everything you copy. Faster.</h1>
            <p className={styles.heroSubtitle}>
              Capture, search, and curate snippets across projects. Beautiful, fast, and synced to the cloud.
            </p>

            <div className={styles.ctaRow}>
              <Link href="/app" className={styles.btnPrimary}>Launch App</Link>
              <Link href="/prices" className={styles.btnSecondary}>Upgrade to Pro</Link>
            </div>

            <div className={styles.trustRow}>
              <span className={styles.dot} /> No tracking • Privacy‑first • Works offline with sync
            </div>
          </div>

          <div className={styles.heroPreview}>
            {/* Preview Card */}
            <div className={styles.previewOuter}>
              <div className={styles.previewCard}>
                <div className={styles.windowBar}>
                  <span />
                  <span />
                  <span />
                </div>
                <div className={styles.previewBody}>
                  <div className={styles.item}>
                    {/* <span className={styles.itemBadge}>JS</span> */}
                    <span className={styles.itemText}>fetch('/api/notes').then(res =&gt; res.json())</span>
                  </div>
                  <div className={styles.item}>
                    <span className={styles.itemBadge}>SQL</span>
                    <span className={styles.itemText}>select * from clipboard_items where project_id = :id</span>
                  </div>
                  <div className={styles.item}>
                    <span className={styles.itemBadge}>CMD</span>
                    <span className={styles.itemText}>npm i clipify-it</span>
                  </div>
                  <div className={styles.item}>
                    <span className={styles.itemBadge}>UX</span>
                    <span className={styles.itemText}>“Dark, modern cards look amazing!”</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE CARDS */}
      <section className={styles.cardsSection}>
        <div className={styles.sectionHeader}>
          <h2>Everything you need to move faster</h2>
          <p>From quick capture to deep search, Clipify It keeps your flow unbroken.</p>
        </div>
        <div className={styles.cardsGrid}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>📋</div>
            <h3>Instant Capture</h3>
            <p>Save any text with one click or paste. Zero friction, all speed.</p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon}>🔎</div>
            <h3>Blazing Search</h3>
            <p>Type to find anything across projects and folders.</p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon}>🗂️</div>
            <h3>Project Folders</h3>
            <p>Group clips by project and keep your workspace tidy.</p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon}>✨</div>
            <h3>Smart Cleanup</h3>
            <p>Auto‑dedupe and keep your best version front and center.</p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon}>☁️</div>
            <h3>Cloud Sync <span className={styles.badgePro}>Pro</span></h3>
            <p>Access your clips anywhere with secure, low‑latency sync.</p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon}>🔒</div>
            <h3>Privacy First</h3>
            <p>Your data, your control. Local‑first with optional sync.</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className={styles.hiwSection}>
        <span className={styles.hiwBlobA} />
        <span className={styles.hiwBlobB} />
        <div className={styles.hiwWrap}>
          <div className={styles.hiwHeader}>
            <h2>How it works</h2>
            <p>Three simple steps to keep your flow unbroken.</p>
          </div>
          <div className={styles.hiwGrid}>
            <div className={styles.hiwCard}>
              <div className={styles.hiwIcon}>📋</div>
              <h3>Capture</h3>
              <p>Copy anything. It’s automatically saved and organized.</p>
            </div>
            <div className={styles.hiwCard}>
              <div className={styles.hiwIcon}>🔎</div>
              <h3>Find</h3>
              <p>Search across projects and folders in milliseconds.</p>
            </div>
            <div className={styles.hiwCard}>
              <div className={styles.hiwIcon}>☁️</div>
              <h3>Sync</h3>
              <p>Upgrade to Pro for encrypted cloud sync across devices.</p>
            </div>
          </div>
        </div>
      </section>

      {/* DEMO IMAGES */}
      <section className={styles.demoSection}>
        {/* <span className={styles.demoBlobA} /> */}
        <span className={styles.demoBlobB} />
        <div className={styles.demoWrap}>
          <div className={styles.demoHeader}>
            <h2>See it in action</h2>
            <p>Add Real Screenshots Below - Update Text</p>
          </div>
          <div className={styles.demoStage}>
            <div className={styles.demoWindow}>
              <div className={styles.demoBar}>
                <span />
                <span />
                <span />
              </div>
              <div className={styles.demoBody}>
                <div className={styles.demoPlaceholder}>
                  <span className={styles.demoTag}>CAPTURE</span>
                  Copy text → saved instantly
                </div>
              </div>
            </div>

            <div className={styles.demoWindow}>
              <div className={styles.demoBar}>
                <span />
                <span />
                <span />
              </div>
              <div className={styles.demoBody}>
                <div className={styles.demoPlaceholder}>
                  <span className={styles.demoTag}>SEARCH</span>
                  Type to find anything
                </div>
              </div>
            </div>

            <div className={styles.demoWindow}>
              <div className={styles.demoBar}>
                <span />
                <span />
                <span />
              </div>
              <div className={styles.demoBody}>
                <div className={styles.demoPlaceholder}>
                  <span className={styles.demoTag}>SYNC</span>
                  Cloud sync across devices
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Optional: keep existing sections to preserve site content */}
      <section className={styles.darkWrap}>
        <Testimonials />
      </section>

      <section className={styles.darkWrapAlt}>
        <CTASection />
      </section>

      <Footer />
    </main>
  );
}
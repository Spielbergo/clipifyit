import Link from 'next/link';
import Image from 'next/image';

import Footer from '../components/Footer.component';

import styles from '../styles/home.module.css';

export default function Home() {
  return (
    <main>
        {/* Full Screen Hero Section */}
        <section className={styles.heroFull}>
            <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
                Clipify It
            </h1>
            <p className={styles.heroSubtitle}>
                The ultimate clipboard manager for productivity.<br />
                Save, search, and organize your clipboard with ease.
            </p>
            <Link href="/app">
                <button className={styles['cta-btn']}>
                Try Free
                </button>
            </Link>
            <div className={styles.heroProPromo}>
                ✨ Upgrade to <b>Pro</b> for unlimited history &amp; cloud sync!
            </div>
            </div>
            <div className={styles.heroVector}>
                <svg
                    viewBox="0 0 500 340"
                    width="440"
                    height="340"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={styles.heroSvg}
                >
                    {/* Background shapes */}
                    <ellipse cx="400" cy="60" rx="70" ry="30" fill="#4fc3f7" opacity="0.15" />
                    <ellipse cx="120" cy="40" rx="40" ry="18" fill="#4fc3f7" opacity="0.10" />
                    <ellipse cx="250" cy="320" rx="180" ry="40" fill="#4fc3f7" opacity="0.13" />

                    {/* Desk */}
                    <rect x="80" y="260" width="340" height="18" rx="9" fill="#374151" />
                    {/* Computer monitor */}
                    <rect x="180" y="90" width="140" height="100" rx="16" fill="#fff" stroke="#4fc3f7" strokeWidth="4" />
                    {/* Monitor stand */}
                    <rect x="240" y="190" width="20" height="30" rx="8" fill="#90caf9" />
                    {/* Keyboard */}
                    <rect x="210" y="230" width="80" height="14" rx="7" fill="#b3e5fc" />

                    {/* Table on screen */}
                    <rect x="200" y="110" width="100" height="60" rx="8" fill="#e3f2fd" />
                    {/* Table rows */}
                    <rect x="210" y="122" width="80" height="10" rx="4" className={styles.clipRow1} />
                    <rect x="210" y="138" width="80" height="10" rx="4" className={styles.clipRow2} />
                    <rect x="210" y="154" width="80" height="10" rx="4" className={styles.clipRow3} />

                    {/* Animated clipboard items flying in */}
                    <g>
                    <rect x="100" y="60" width="32" height="18" rx="6" fill="#4fc3f7" className={styles.clipAnim1} />
                    <rect x="130" y="30" width="32" height="18" rx="6" fill="#4fc3f7" className={styles.clipAnim2} />
                    <rect x="170" y="20" width="32" height="18" rx="6" fill="#4fc3f7" className={styles.clipAnim3} />
                    </g>
                </svg>
            </div>
        </section>

        {/* Features Section */}
        <section className={styles.features}>
            <div className={styles.features__container}>
                <h2 className={styles.sectionTitle}>
                    Why Clipify It?
                </h2>
                <div className={styles.featureCard}>
                    <div className={styles.featureIcon}>📋</div>
                    <h3>Save Everything <span className={styles.proBadge}>Pro</span></h3>
                    <p>Automatically keep a history of everything you copy. Never lose a snippet again.</p>
                </div>
                <div className={styles.featureCard}>
                    <div className={styles.featureIcon}>🔍</div>
                    <h3>Instant Search <span className={styles.proBadge}>Pro</span></h3>
                    <p>Find any clipboard item in seconds with powerful search and filters.</p>
                </div>
                <div className={styles.featureCard}>
                    <div className={styles.featureIcon}>🗂️</div>
                    <h3>Organize <span className={styles.proBadge}>Pro</span></h3>
                    <p>Group your clips into folders and keep your workflow tidy and efficient.</p>
                </div>
                <div className={styles.featureCard}>
                    <div className={styles.featureIcon}>☁️</div>
                    <h3>
                    Cloud Sync <span className={styles.proBadge}>Pro</span>
                    </h3>
                    <p>Access your clipboard history anywhere with secure cloud sync.</p>
                </div>
                <div className={styles.featureCard}>
                    <div className={styles.featureIcon}>🔒</div>
                    <h3>
                    Unlimited History <span className={styles.proBadge}>Pro</span>
                    </h3>
                    <p>Keep as many clipboard items as you want—no limits!</p>
                </div>
            </div>
            </section>

            {/* Upgrade to Pro Section */}
            <section className={styles.proPromoSection}>
            <div className={styles.proPromoContent}>
                <h2>
                Unlock <span className={styles.proBadgeBig}>Pro</span> for just <span className={styles.proPrice}>$0.99/mo</span>
                </h2>
                <p>
                Get unlimited history, cloud sync, and more. Cancel anytime.
                </p>
                <Link href="/signup">
                <button className={styles.proCtaBtn}>Upgrade to Pro</button>
                </Link>
            </div>
        </section>

        {/* Screenshots Section */}
        <section className={styles.screenshots}>
            <h2 className={styles.sectionTitle} style={{ color: '#232b36' }}>
                See Clipify It in Action
            </h2>
            <div className={styles.screenshotScroller}>
                <Image
                src="/screenshots/clipifyit-screenshot.jpg"
                alt="Clipboard Table"
                className={styles.screenshotImg}
                width={1280}
                height={768}
                priority={true}
                />
                <Image
                src="/screenshots/clipifyit-screenshot-2.jpg"
                alt="Search Feature"
                className={styles.screenshotImg}
                width={1280}
                height={768}
                />
                <Image
                src="/screenshots/clipifyit-screenshot.jpg"
                alt="Folders Feature"
                className={styles.screenshotImg}
                width={1280}
                height={768}
                />
            </div>
        </section>

        {/* Testimonials Section */}
        <section className={styles.testimonials}>
            <h2 className={styles.sectionTitle}>
                What Users Are Saying
            </h2>
            <div className={styles.testimonialGrid}>
                <div className={styles.testimonialCard}>
                <span className={styles.quoteIcon}>“</span>
                <div className={styles.testimonialText}>
                    Clipify It has completely changed how I work. I never lose anything I copy, and searching old clips is instant!
                </div>
                <div className={styles.testimonialUser}>— Alex P.</div>
                </div>
                <div className={styles.testimonialCard}>
                <span className={styles.quoteIcon}>“</span>
                <div className={styles.testimonialText}>
                    The Pro version is a no-brainer. Cloud sync and unlimited history for less than a coffee a month!
                </div>
                <div className={styles.testimonialUser}>— Jamie L.</div>
                </div>
                <div className={styles.testimonialCard}>
                <span className={styles.quoteIcon}>“</span>
                <div className={styles.testimonialText}>
                    I love how simple and fast Clipify It is. Organizing my clipboard has never been easier.
                </div>
                <div className={styles.testimonialUser}>— Morgan S.</div>
                </div>
            </div>
        </section>

        {/* Call to Action Section */}
        <section className={styles.ctaSection}>
            <div className={styles.ctaContent}>
                <h2 className={styles.ctaTitle}>
                Ready to supercharge your clipboard?
                </h2>
                <p className={styles.ctaSubtitle}>
                Try Clipify It free, or unlock Pro for just <span className={styles.proPrice}>$0.99/mo</span>!
                </p>
                <div className={styles.ctaButtons}>
                <Link href="/app">
                    <button className={styles.ctaBtnPrimary}>Try Free</button>
                </Link>
                <Link href="/signup">
                    <button className={styles.ctaBtnSecondary}>Upgrade to Pro</button>
                </Link>
                </div>
            </div>
        </section>

        {/* Footer */}
        <Footer />
    </main>
  );
}
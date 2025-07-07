import Link from 'next/link';
import Image from 'next/image';

import LogoWhite from '../public/logos/logo-light-text.png';

import styles from './footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.footerBrand}>
          <span className={styles.footerLogo}><Image
              src={LogoWhite}
              alt="Clipify It logo"
              aria-label="Clipify It logo"
              width="150"
              height="50"
              priority
            />
            </span>
        </div>
        <nav className={styles.footerNav}>
          <Link href="/" className={styles.footerLink}>Home</Link>
          <Link href="/#features" className={styles.footerLink}>Features</Link>
          <Link href="/faq" className={styles.footerLink}>FAQ</Link>
          <Link href="/contact" className={styles.footerLink}>Contact</Link>
          <Link href="/privacy" className={styles.footerLink}>Privacy</Link>
        </nav>
        <span className={styles.footerCopyright}>
            &copy; {new Date().getFullYear()} Clipify It. A <Link href="https://webcheddar.ca" target="_blank">Web Cheddar</Link> project.
          </span>
      </div>
    </footer>
  );
}
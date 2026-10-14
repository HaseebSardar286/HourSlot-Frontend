import Link from 'next/link';
import Image from 'next/image';
import styles from './landing.module.css';

export default function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div className={styles.footerBrand}>
          <Image
            src="/logo-hourslot.png"
            alt="HourSlot"
            width={156}
            height={47}
            className={styles.footerLogo}
          />
          <p>Book the hour that fits — for customers, individuals, and businesses.</p>
        </div>
        <div>
          <h4>Product</h4>
          <Link href="/profile/explore">Explore</Link>
          <a href="#how">How it works</a>
          <a href="#paths">Get started</a>
        </div>
        <div>
          <h4>Account</h4>
          <Link href="/auth/register">Create account</Link>
          <Link href="/auth/login">Sign in</Link>
          <a href="#faq">FAQ</a>
        </div>
        <div>
          <h4>Connect</h4>
          <a href="mailto:hello@hourslot.app">hello@hourslot.app</a>
        </div>
      </div>
      <p className={styles.copy}>© 2026 HourSlot. All rights reserved.</p>
    </footer>
  );
}

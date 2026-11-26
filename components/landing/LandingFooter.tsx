import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import styles from './landing.module.css';

export default function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div className={styles.footerBrand}>
          <BrandLogo kind="wordmark" variant="white" height={28} className={styles.footerLogo} />
          <p>The booking marketplace for local services, and the system that runs them.</p>
        </div>
        <div>
          <h4>Customers</h4>
          <Link href="/profile/explore">Explore providers</Link>
          <a href="#categories">Categories</a>
          <a href="#how">How it works</a>
          <Link href="/auth/register">Create account</Link>
        </div>
        <div>
          <h4>Providers</h4>
          <Link href="/auth/register?role=business">List a business</Link>
          <Link href="/auth/register?role=individual">Join as an individual</Link>
          <a href="#providers">Features</a>
        </div>
        <div>
          <h4>Help</h4>
          <a href="#faq">FAQ</a>
          <Link href="/auth/login">Sign in</Link>
          <a href="mailto:hello@duemet.app">hello@duemet.app</a>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <p>© 2026 Duemet. All rights reserved.</p>
        <p>Photos: Unsplash</p>
      </div>
    </footer>
  );
}

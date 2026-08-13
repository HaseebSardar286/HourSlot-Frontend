'use client';

import Link from 'next/link';
import Image from 'next/image';
import styles from './landing.module.css';

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.brand}>
            <Image src="/logo-hourslot.png" alt="HourSlot" width={148} height={44} priority className={styles.logo} />
          </Link>
          <div className={styles.navActions}>
            <Link href="/auth/login" className={styles.navLink}>
              Sign in
            </Link>
            <Link href="/auth/register" className="btn btn-primary btn-sm">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroAtmosphere} aria-hidden />
        <div className={styles.heroContent}>
          <Image
            src="/logo-hourslot.png"
            alt="HourSlot"
            width={220}
            height={68}
            className={styles.heroLogo}
            priority
          />
          <h1 className={styles.heroTitle}>Appointments that run themselves</h1>
          <p className={styles.heroSub}>
            Discover nearby services, book the perfect slot, and let businesses manage every visit — in one calm, modern workspace.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/auth/register?role=customer" className="btn btn-primary">
              Book appointments
            </Link>
            <Link href="/auth/register?role=business" className="btn btn-secondary">
              List your business
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>How it works</h2>
        <p className={styles.sectionSub}>Three steps from discovery to a confirmed visit.</p>
        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={styles.stepNum}>01</span>
            <h3>Find the right place</h3>
            <p>Search nearby salons, clinics, and studios with real ratings and availability.</p>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>02</span>
            <h3>Pick your slot</h3>
            <p>Choose a service, preferred staff, and a time that fits — including peak pricing transparency.</p>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>03</span>
            <h3>Show up ready</h3>
            <p>Get confirmations, manage bookings, and leave a review when you&apos;re done.</p>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <h2 className={styles.sectionTitle}>Built for growing businesses</h2>
        <p className={styles.sectionSub}>
          Branches, staff schedules, packages, peak pricing, and a live booking calendar — without the spreadsheet chaos.
        </p>
        <ul className={styles.featureList}>
          <li>
            <i className="fa-solid fa-calendar-check" aria-hidden />
            Live availability with conflict-safe booking
          </li>
          <li>
            <i className="fa-solid fa-users" aria-hidden />
            Multi-branch staff and service catalogs
          </li>
          <li>
            <i className="fa-solid fa-chart-line" aria-hidden />
            Peak pricing and package offers
          </li>
        </ul>
        <Link href="/auth/register?role=business" className="btn btn-primary" style={{ marginTop: 28 }}>
          Start listing
        </Link>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Made for customers who value their time</h2>
        <p className={styles.sectionSub}>
          Explore what&apos;s near you, save favorites, and keep every appointment in one place.
        </p>
        <ul className={styles.featureList}>
          <li>
            <i className="fa-solid fa-location-dot" aria-hidden />
            Nearby discovery with categories and search
          </li>
          <li>
            <i className="fa-solid fa-heart" aria-hidden />
            Favorites and booking history at a glance
          </li>
          <li>
            <i className="fa-solid fa-bell" aria-hidden />
            Status updates when plans change
          </li>
        </ul>
        <Link href="/auth/register?role=customer" className="btn btn-primary" style={{ marginTop: 28 }}>
          Create a free account
        </Link>
      </section>

      <section className={styles.finalCta}>
        <h2>Ready when you are</h2>
        <p>Join HourSlot and turn empty hours into booked ones.</p>
        <div className={styles.heroCtas}>
          <Link href="/auth/register" className="btn btn-primary">
            Get started
          </Link>
          <Link href="/auth/login" className="btn btn-outline">
            Sign in
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <Image src="/logo-hourslot.png" alt="" width={100} height={30} className={styles.footerLogo} />
        <p>© {new Date().getFullYear()} HourSlot. Smart booking for modern service businesses.</p>
        <Link href="/auth/login">Sign in</Link>
      </footer>
    </div>
  );
}

import Reveal from '@/components/Reveal';
import Link from 'next/link';
import { PROVIDER_POINTS } from './data';
import styles from './landing.module.css';
import { DashboardMockup } from './ProductMockups';

export default function LandingProviders() {
  return (
    <Reveal as="section" className={styles.providers} id="providers">
      <div className={styles.providersInner}>
        <div className={styles.providersCopy}>
          <p className={styles.eyebrowOnDark}>For businesses and independents</p>
          <h2>Fill your calendar without the phone tag.</h2>
          <p>
            Salons, clinics, studios and solo pros run bookings, staff, services and branches from
            one dashboard, and get found by customers nearby.
          </p>
          <ul className={styles.providersList}>
            {PROVIDER_POINTS.map((point) => (
              <li key={point}>
                <i className="fa-solid fa-check" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
          <div className={styles.inlineActions}>
            <Link href="/auth/register?role=business" className={styles.btnOnDark}>
              List your business
            </Link>
            <Link href="/auth/register?role=individual" className={styles.btnOutlineOnDark}>
              Join as an individual
            </Link>
          </div>
        </div>
        <DashboardMockup />
      </div>
    </Reveal>
  );
}

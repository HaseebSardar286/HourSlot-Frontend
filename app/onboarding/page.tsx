'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import styles from './onboarding.module.css';

const CUSTOMER_FEATURES = [
  { icon: 'fa-magnifying-glass', title: 'Discover', desc: 'Find businesses near you by location or category' },
  { icon: 'fa-calendar-days', title: 'Book Instantly', desc: 'Pick a time slot and book in seconds' },
  { icon: 'fa-clock', title: 'Reminders', desc: 'Never miss an appointment with smart notifications' },
  { icon: 'fa-star', title: 'Rate & Review', desc: 'Share your experience and help others choose' },
];

const BUSINESS_FEATURES = [
  { icon: 'fa-store', title: 'Setup Shop', desc: 'Add branches, services, staff & working hours' },
  { icon: 'fa-chart-simple', title: 'Dashboard', desc: 'Track bookings, revenue & customer insights' },
  { icon: 'fa-calendar-check', title: 'Smart Scheduling', desc: 'Automated availability & conflict detection' },
  { icon: 'fa-chart-line', title: 'Grow', desc: 'Get discovered by thousands of local customers' },
];

export default function OnboardingPage() {
  const { user } = useAuth();

  const isBusiness = user?.role === 'BUSINESS_OWNER';
  const features = isBusiness ? BUSINESS_FEATURES : CUSTOMER_FEATURES;
  const firstName = user?.firstName || 'there';

  return (
    <>
      <div className="auth-page-bg" />
      <div className={styles.onboardingWrapper}>
        <div className={`glass-card ${styles.onboardingCard}`}>
          <span className={styles.welcomeIcon}>
            {isBusiness ? (
              <i className="fa-solid fa-circle-check" style={{ color: 'var(--accent-secondary)' }}></i>
            ) : (
              <i className="fa-solid fa-face-smile" style={{ color: 'var(--accent-primary)' }}></i>
            )}
          </span>
          <h1 className={styles.welcomeTitle}>
            Welcome, <span className={styles.welcomeHighlight}>{firstName}!</span>
          </h1>
          <p className={styles.welcomeSubtitle}>
            {isBusiness
              ? 'Your business registration is being reviewed. In the meantime, here\'s what you can do once verified:'
              : 'You\'re all set! Here\'s how to get the most out of HourSlot:'}
          </p>

          <div className={styles.features}>
            {features.map((f, i) => (
              <div key={i} className={styles.featureItem}>
                <span className={styles.featureIcon}>
                  <i className={`fa-solid ${f.icon}`} style={{ color: 'var(--accent-primary)' }}></i>
                </span>
                <div className={styles.featureContent}>
                  <span className={styles.featureTitle}>{f.title}</span>
                  <span className={styles.featureDesc}>{f.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.actionButtons}>
            {isBusiness ? (
              <>
                <Link href="/business/dashboard" className="btn btn-primary">
                  Go to Dashboard
                </Link>
                <Link href="/profile" className="btn btn-secondary">
                  View Profile
                </Link>
              </>
            ) : (
              <>
                <Link href="/profile" className="btn btn-primary">
                  Explore Businesses
                </Link>
                <Link href="/profile" className="btn btn-secondary">
                  Complete Profile
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

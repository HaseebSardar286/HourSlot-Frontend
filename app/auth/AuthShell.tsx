'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import AuthFlipStage from './AuthFlip';
import styles from './auth-layout.module.css';

const FEATURES = [
  {
    icon: 'fa-bolt',
    title: 'Book in seconds',
    text: 'Live availability across salons, clinics, and pros near you.',
  },
  {
    icon: 'fa-chart-line',
    title: 'Run your day',
    text: 'Services, staff, and calendars stay in one calm workspace.',
  },
  {
    icon: 'fa-lock',
    title: 'Built for trust',
    text: 'Verified listings and secure accounts for every side of the booking.',
  },
];

export default function AuthShell({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const isRegister = pathname?.startsWith('/auth/register');

  return (
    <div className={`${styles.shell} ${className} ${isRegister ? styles.shellRegister : ''}`}>
      <aside className={styles.brandPanel} aria-label="HourSlot">
        <div className={styles.brandGlow} aria-hidden />
        <div className={styles.brandOrbA} aria-hidden />
        <div className={styles.brandOrbB} aria-hidden />
        <div className={styles.brandGrid} aria-hidden />

        <div className={styles.brandInner}>
          <Link href="/" className={styles.brandMark}>
            <Image
              src="/logo-hourslot.png"
              alt="HourSlot"
              width={200}
              height={62}
              className={styles.brandLogo}
              priority
            />
          </Link>

          <p className={styles.brandEyebrow}>Appointment platform</p>
          <h1 className={styles.brandTitle}>
            Your time,
            <span className={styles.brandTitleAccent}> well booked.</span>
          </h1>
          <p className={styles.brandCopy}>
            Discover services, claim the right slot, and run appointments with clarity.
          </p>

          <ul className={styles.featureList}>
            {FEATURES.map((f, i) => (
              <li
                key={f.title}
                className={styles.featureItem}
                style={{ animationDelay: `${0.15 + i * 0.08}s` }}
              >
                <span className={styles.featureIcon} aria-hidden>
                  <i className={`fa-solid ${f.icon}`} />
                </span>
                <div className={styles.featureCopy}>
                  <strong>{f.title}</strong>
                  <p>{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className={styles.brandFoot}>Trusted by service teams & independents</p>
      </aside>

      <div className={`${styles.formPanel} ${isRegister ? styles.formPanelRegister : ''}`}>
        <div className={styles.formAtmosphere} aria-hidden />
        <div className={styles.mobileBrand}>
          <Link href="/">
            <Image
              src="/logo-hourslot.png"
              alt="HourSlot"
              width={148}
              height={44}
              className={styles.mobileLogo}
              priority
            />
          </Link>
        </div>
        <div className={`${styles.formInner} ${isRegister ? styles.formInnerWide : ''}`}>
          <AuthFlipStage>{children}</AuthFlipStage>
        </div>
        {!isRegister && (
          <p className={styles.formFooter}>
            <Link href="/">← Back to HourSlot home</Link>
          </p>
        )}
      </div>
    </div>
  );
}

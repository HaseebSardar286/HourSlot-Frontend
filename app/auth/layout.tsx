import { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './auth-layout.module.css';

const FEATURES = [
  {
    icon: 'fa-calendar-check',
    title: 'Smart scheduling',
    text: 'Live availability and instant booking for customers.',
  },
  {
    icon: 'fa-store',
    title: 'Business tools',
    text: 'Manage services, staff, and appointments in one place.',
  },
  {
    icon: 'fa-shield-halved',
    title: 'Secure accounts',
    text: 'Your data is protected with industry-standard security.',
  },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <div className={styles.brandPanel}>
        <div className={styles.brandInner}>
          <Link href="/">
            <Image
              src="/logo-hourslot.png"
              alt="HourSlot"
              width={200}
              height={62}
              className={styles.brandLogo}
              priority
            />
          </Link>
          <h1 className={styles.brandTitle}>Book smarter. Run smoother.</h1>
          <p className={styles.brandCopy}>
            The appointment platform for service businesses and the people who book them.
          </p>
          <ul className={styles.featureList}>
            {FEATURES.map((f) => (
              <li key={f.title} className={styles.featureItem}>
                <span className={styles.featureIcon}>
                  <i className={`fa-solid ${f.icon}`} />
                </span>
                <div>
                  <strong>{f.title}</strong>
                  <span>{f.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className={styles.formPanel}>
        <div className={styles.mobileBrand}>
          <Link href="/">
            <Image
              src="/logo-hourslot.png"
              alt="HourSlot"
              width={140}
              height={42}
              className={styles.mobileLogo}
              priority
            />
          </Link>
        </div>
        <div className={styles.formInner}>{children}</div>
        <p className={styles.formFooter}>
          <Link href="/">← Back to HourSlot home</Link>
        </p>
      </div>
    </div>
  );
}

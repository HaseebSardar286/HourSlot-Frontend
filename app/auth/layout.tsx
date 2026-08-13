import { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './auth-layout.module.css';

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
        </div>
      </div>
      <div className={styles.formPanel}>
        <div className={styles.formInner}>{children}</div>
      </div>
    </div>
  );
}

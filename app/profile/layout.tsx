'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import HeaderNav from '@/components/HeaderNav';
import NotificationPanel from '@/components/NotificationPanel';
import styles from './profile-layout.module.css';

const NAV = [
  { href: '/profile/explore', label: 'Explore' },
  { href: '/profile/bookings', label: 'Appointments' },
  { href: '/profile/packages', label: 'Packages' },
  { href: '/profile/favorites', label: 'Favorites' },
  { href: '/profile', label: 'Account', exact: true },
];

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className={styles.shell}>
      <header className={`app-header ${styles.header}`}>
        <div className={styles.headerInner}>
          <div className={styles.left}>
            <Link href="/profile/explore" className={styles.brand}>
              <Image src="/logo-hourslot.png" alt="HourSlot" width={120} height={36} priority className={styles.logo} />
            </Link>
            <nav className={styles.nav} aria-label="Customer">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navLink} ${isActive(item.href, item.exact) ? styles.navActive : ''}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className={styles.right}>
            <NotificationPanel />
            <HeaderNav />
          </div>
        </div>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className="app-footer">
        <div className="footer-container">
          <p>© {new Date().getFullYear()} HourSlot. Smart scheduling.</p>
          <div className="footer-links">
            <Link href="/">Home</Link>
            <a href="mailto:support@hourslot.app">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

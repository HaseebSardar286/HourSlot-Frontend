'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import HeaderNav from '@/components/HeaderNav';
import NotificationPanel from '@/components/NotificationPanel';
import styles from './profile-layout.module.css';

const GUEST_NAV = [
  { href: '/profile/explore', label: 'Explore' },
  { href: '/#pricing', label: 'Pricing' },
];

const CUSTOMER_NAV = [
  { href: '/profile/explore', icon: 'fa-magnifying-glass', label: 'Explore' },
  { href: '/profile/bookings', icon: 'fa-calendar', label: 'My Bookings' },
  { href: '/profile/favorites', icon: 'fa-heart', label: 'Favorites' },
  { href: '/profile/packages', icon: 'fa-box', label: 'Packages' },
  { href: '/profile', icon: 'fa-gear', label: 'Settings', exact: true },
];

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) => {
    if (href.startsWith('/#')) return false;
    if (exact) return pathname === href;
    if (href === '/profile/explore') {
      return (
        pathname === href ||
        pathname.startsWith('/profile/explore') ||
        pathname.startsWith('/profile/business') ||
        pathname.startsWith('/profile/book')
      );
    }
    if (href === '/profile') return pathname === '/profile';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleLogout = () => {
    document.cookie = 'hourslot_user_session=; path=/; max-age=0';
    logout();
    router.push('/');
  };

  if (!loading && isAuthenticated && user) {
    const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`;
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    const isExplore = pathname.startsWith('/profile/explore');

    return (
      <div className={styles.dash}>
        {menuOpen && (
          <button type="button" className={styles.backdrop} aria-label="Close menu" onClick={() => setMenuOpen(false)} />
        )}
        <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ''}`}>
          <Link href="/" className={styles.sideBrand}>
            <Image src="/logo-hourslot.png" alt="HourSlot" width={132} height={40} priority className={styles.sideLogo} />
          </Link>
          <nav className={styles.sideNav} aria-label="Customer">
            {CUSTOMER_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.sideLink} ${isActive(item.href, item.exact) ? styles.sideLinkActive : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                <i className={`fa-solid ${item.icon}`} aria-hidden />
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/#pricing" className={styles.proCard} onClick={() => setMenuOpen(false)}>
            <strong>Pro Account</strong>
            <span>Get priority booking &amp; exclusive deals.</span>
          </Link>
        </aside>

        <div className={styles.dashMain}>
          <header className={styles.topbar}>
            <button
              type="button"
              className={styles.hamburger}
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <i className="fa-solid fa-bars" />
            </button>
            <div className={styles.topbarRight}>
              <NotificationPanel />
              <div className={styles.userWrap}>
                <button type="button" className={styles.userBtn} onClick={() => setUserOpen((v) => !v)}>
                  <span className={styles.avatar}>{initials || 'U'}</span>
                  <span className={styles.userMeta}>
                    <strong>{fullName}</strong>
                    <em>Premium Member</em>
                  </span>
                </button>
                {userOpen && (
                  <div className={styles.userMenu}>
                    <Link href="/profile" onClick={() => setUserOpen(false)}>Account settings</Link>
                    <button type="button" onClick={handleLogout}>Sign out</button>
                  </div>
                )}
              </div>
            </div>
          </header>
          <div className={isExplore ? styles.dashBodyFill : styles.dashBody}>{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <header className={`app-header ${styles.header}`}>
        <div className={styles.headerInner}>
          <div className={styles.left}>
            <Link href="/" className={styles.brand}>
              <Image src="/logo-hourslot.png" alt="HourSlot" width={120} height={36} priority className={styles.logo} />
            </Link>
            <nav className={styles.nav} aria-label="Customer">
              {GUEST_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navLink} ${isActive(item.href) ? styles.navActive : ''}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className={styles.right}>
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
            <Link href="/profile/explore">Explore</Link>
            <Link href="/#pricing">Pricing</Link>
            <a href="mailto:support@hourslot.app">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

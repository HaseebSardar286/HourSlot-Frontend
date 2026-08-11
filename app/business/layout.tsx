'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import styles from './business-layout.module.css';

const OWNER_LINKS = [
  { href: '/business/dashboard', icon: 'fa-chart-pie', label: 'Overview' },
  { href: '/business/bookings', icon: 'fa-calendar-check', label: 'Bookings' },
  { href: '/business/branches', icon: 'fa-network-wired', label: 'Branches' },
  { href: '/business/services', icon: 'fa-tags', label: 'Services' },
  { href: '/business/packages', icon: 'fa-gift', label: 'Packages' },
  { href: '/business/staff', icon: 'fa-user-tie', label: 'Staff' },
  { href: '/business/staff-services', icon: 'fa-handshake', label: 'Staff Rates' },
  { href: '/business/availability', icon: 'fa-calendar-days', label: 'Availability' },
  { href: '/business/peak-pricing', icon: 'fa-bolt', label: 'Peak Pricing' },
  { href: '/business/gallery', icon: 'fa-images', label: 'Gallery' },
];

const STAFF_LINKS = [
  { href: '/business/bookings', icon: 'fa-calendar-check', label: 'Bookings' },
  { href: '/business/availability', icon: 'fa-calendar-days', label: 'My Availability' },
];

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isStaff = user?.role === 'BUSINESS_STAFF';
  const links = isStaff ? STAFF_LINKS : OWNER_LINKS;

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/auth/login');
      } else if (user?.role !== 'BUSINESS_OWNER' && user?.role !== 'BUSINESS_STAFF') {
        router.push('/profile/explore');
      } else if (isStaff) {
        const allowed = STAFF_LINKS.some((l) => pathname.startsWith(l.href));
        if (!allowed && pathname !== '/business/register') {
          router.replace('/business/bookings');
        }
      }
    }
  }, [loading, isAuthenticated, user, router, pathname, isStaff]);

  if (loading || !isAuthenticated || (user?.role !== 'BUSINESS_OWNER' && user?.role !== 'BUSINESS_STAFF')) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: 'var(--bg-primary)'
      }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderTopColor: 'var(--accent-primary)', borderWidth: '4px' }} />
      </div>
    );
  }

  const handleLogout = () => {
    document.cookie = 'hourslot_user_session=; path=/; max-age=0';
    logout();
    router.push('/auth/login');
  };

  const getPageTitle = () => {
    const match = links.find((l) => pathname.startsWith(l.href));
    return match?.label || 'Business Dashboard';
  };

  const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`;

  return (
    <div className={styles.adminContainer}>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            border: 'none',
            zIndex: 1090,
          }}
        />
      )}

      <aside
        className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''} ${mobileOpen ? styles.sidebarMobileOpen : ''}`}
      >
        <div className={styles.sidebarHeader}>
          {!collapsed && (
            <Link href={isStaff ? '/business/bookings' : '/business/dashboard'} className={styles.logoArea}>
              <img
                src="/logo-hourslot.png"
                alt="HourSlot Logo"
                style={{ height: '39px', width: 'auto', objectFit: 'contain' }}
              />
            </Link>
          )}
          {collapsed && (
            <span
              className={styles.logoIcon}
              style={{ marginLeft: '-25px', marginTop: '8px', cursor: 'pointer' }}
              onClick={() => setCollapsed(!collapsed)}
              title="Expand sidebar"
            >
              <img src="/logo-hourslot.png" alt="HourSlot Logo" style={{ height: '39px', width: 'auto' }} />
            </span>
          )}
          <button className={styles.toggleBtn} onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <i className={`fa-solid ${collapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navItem} ${pathname.startsWith(link.href) ? styles.navActive : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className={styles.navIcon}><i className={`fa-solid ${link.icon}`}></i></span>
              {!collapsed && <span>{link.label}</span>}
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <span className={styles.navIcon}><i className="fa-solid fa-right-from-bracket"></i></span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className={styles.mainContent}>
        <header className={styles.topbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              className={styles.mobileMenuBtn}
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <i className="fa-solid fa-bars" />
            </button>
            <h1 className={styles.pageTitle}>{getPageTitle()}</h1>
          </div>

          <div className={styles.topbarActions}>
            {!isStaff && (
              <Link href="/profile/explore" className={styles.roleSwitchBtn} title="Switch to customer view">
                <i className="fa-solid fa-users"></i>
                <span>Customer Mode</span>
              </Link>
            )}

            <div className={styles.userProfile}>
              <div className={styles.userAvatar}>{initials}</div>
              <div className={styles.userInfo}>
                <div className={styles.userName}>{user.firstName} {user.lastName}</div>
                <div className={styles.userRole}>
                  {user.role === 'BUSINESS_OWNER' ? 'Business Owner' : 'Staff Member'}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className={styles.pageBody}>{children}</main>
      </div>
    </div>
  );
}

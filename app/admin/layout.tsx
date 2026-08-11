'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import styles from './admin-layout.module.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'SUPER_ADMIN')) {
      router.push('/auth/login');
    }
  }, [loading, isAuthenticated, user, router]);

  if (loading || !isAuthenticated || user?.role !== 'SUPER_ADMIN') {
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
    if (pathname.startsWith('/admin/dashboard')) return 'Dashboard Overview';
    if (pathname.startsWith('/admin/users')) return 'User Account Control';
    if (pathname.startsWith('/admin/businesses')) {
      if (pathname.match(/\/admin\/businesses\/\d+/)) return 'Business Account Verification';
      return 'Business Registration Control';
    }
    if (pathname.startsWith('/admin/settings')) return 'Global Platform Configuration';
    if (pathname.startsWith('/admin/categories')) return 'Category Taxonomy Management';
    if (pathname.startsWith('/admin/audit-logs')) return 'System Security Logs';
    return 'Administration Panel';
  };

  const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`;

  return (
    <div className={styles.adminContainer}>
      {/* Collapsible Sidebar */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
        <div className={styles.sidebarHeader}>
          {!collapsed && (
            <Link href="/admin/dashboard" className={styles.logoArea}>
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
              <img
                src="/logo-hourslot.png"
                alt="HourSlot Logo"
                style={{ height: '39px', width: 'auto' }}
              />
            </span>
          )}
          <button className={styles.toggleBtn} onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <i className={`fa-solid ${collapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          <Link href="/admin/dashboard" className={`${styles.navItem} ${pathname.startsWith('/admin/dashboard') ? styles.navActive : ''}`}>
            <span className={styles.navIcon}><i className="fa-solid fa-chart-pie"></i></span>
            {!collapsed && <span>Dashboard</span>}
          </Link>
          <Link href="/admin/users" className={`${styles.navItem} ${pathname.startsWith('/admin/users') ? styles.navActive : ''}`}>
            <span className={styles.navIcon}><i className="fa-solid fa-users"></i></span>
            {!collapsed && <span>User Accounts</span>}
          </Link>
          <Link href="/admin/businesses" className={`${styles.navItem} ${pathname.startsWith('/admin/businesses') ? styles.navActive : ''}`}>
            <span className={styles.navIcon}><i className="fa-solid fa-store"></i></span>
            {!collapsed && <span>Businesses</span>}
          </Link>
          <Link href="/admin/categories" className={`${styles.navItem} ${pathname.startsWith('/admin/categories') ? styles.navActive : ''}`}>
            <span className={styles.navIcon}><i className="fa-solid fa-tags"></i></span>
            {!collapsed && <span>Categories</span>}
          </Link>
          <Link href="/admin/settings" className={`${styles.navItem} ${pathname.startsWith('/admin/settings') ? styles.navActive : ''}`}>
            <span className={styles.navIcon}><i className="fa-solid fa-sliders"></i></span>
            {!collapsed && <span>Settings</span>}
          </Link>
          <Link href="/admin/audit-logs" className={`${styles.navItem} ${pathname.startsWith('/admin/audit-logs') ? styles.navActive : ''}`}>
            <span className={styles.navIcon}><i className="fa-solid fa-shield-halved"></i></span>
            {!collapsed && <span>Audit Trail</span>}
          </Link>
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href="/profile" className={styles.logoutBtn} style={{ marginBottom: '8px', color: '#a3c4c8' }} title="Go to Customer View">
            <span className={styles.navIcon}><i className="fa-solid fa-arrow-right-to-bracket"></i></span>
            {!collapsed && <span>Customer View</span>}
          </Link>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Sign Out">
            <span className={styles.navIcon}><i className="fa-solid fa-power-off"></i></span>
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        <header className={styles.topbar}>
          <h1 className={styles.pageTitle}>{getPageTitle()}</h1>
          <div className={styles.topbarActions}>
            <span className={styles.roleIndicator}>Super Admin</span>
            <div className={styles.adminProfile}>
              <div className={styles.avatar}>{initials}</div>
              <span className={styles.adminName}>{user.firstName} {user.lastName}</span>
            </div>
          </div>
        </header>
        <div className={styles.pageBody}>
          {children}
        </div>
      </main>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import NotificationPanel from '@/components/NotificationPanel';
import { ADMIN_NAV } from '@/lib/nav';
import styles from './admin-layout.module.css';

const LINKS = ADMIN_NAV.flatMap((g) => g.children);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Only one menu group is open at a time. Until the user picks one (on this page), the group holding the
  // current page is open; `id: null` means the user closed everything.
  const [openPick, setOpenPick] = useState<{ path: string; id: string | null } | null>(null);

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'SUPER_ADMIN')) {
      router.push('/auth/login');
    }
  }, [loading, isAuthenticated, user, router]);

  if (loading || !isAuthenticated || user?.role !== 'SUPER_ADMIN') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <div
          className="spinner"
          style={{ width: 40, height: 40, borderTopColor: 'var(--accent-primary)', borderWidth: 4 }}
        />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const getPageTitle = () => {
    const match = LINKS.find((l) => pathname.startsWith(l.href));
    if (pathname.match(/\/admin\/businesses\/\d+/)) return 'Business verification';
    return match?.label || 'Administration';
  };

  const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`;

  return (
    <div className={styles.adminContainer}>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className={styles.mobileOverlay}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''} ${
          mobileOpen ? styles.sidebarMobileOpen : ''
        }`}
      >
        <div className={styles.sidebarHeader}>
          {!collapsed && (
            <Link href="/admin/dashboard" className={styles.logoArea}>
              <img src="/duemet-logo-nav-white.png" alt="Duemet" className={styles.logoImg} />
            </Link>
          )}
          {collapsed ? (
            <button
              type="button"
              className={styles.logoIcon}
              style={{ cursor: 'pointer', border: 'none', background: 'transparent', padding: 0 }}
              onClick={() => setCollapsed(false)}
              title="Expand sidebar"
            >
              <img src="/duemet-mark-white.png" alt="Duemet" style={{ width: 29, height: 29, objectFit: 'contain', display: 'block' }} />
            </button>
          ) : (
            <button type="button" className={styles.toggleBtn} onClick={() => setCollapsed(true)} title="Collapse sidebar">
              <i className="fa-solid fa-angles-left" />
            </button>
          )}
        </div>

        <nav className={styles.sidebarNav}>
          {ADMIN_NAV.map((group) => {
            const picked = openPick && openPick.path === pathname ? openPick.id : undefined;
            const open = !collapsed && (picked === undefined
              ? group.children.some((child) => pathname.startsWith(child.href))
              : picked === group.id);
            return (
              <div key={group.id} className={`${styles.navGroup} ${open ? styles.navGroupOpen : ''}`}>
                <button
                  type="button"
                  className={styles.navGroupBtn}
                  onClick={() => !collapsed && setOpenPick({ path: pathname, id: open ? null : group.id })}
                  title={group.label}
                  aria-expanded={open}
                >
                  <span className={styles.navIcon}><i className={`fa-solid ${group.icon}`} /></span>
                  {!collapsed && <span>{group.label}</span>}
                  {!collapsed && <i className={`fa-solid fa-chevron-${open ? 'down' : 'right'} ${styles.navChevron}`} />}
                </button>
                {(collapsed || open) && (
                  <div className={styles.navChildren}>
                    {group.children.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`${styles.navItem} ${styles.navChild} ${pathname.startsWith(link.href) ? styles.navActive : ''}`}
                        onClick={() => setMobileOpen(false)}
                      >
                        <span className={styles.navIcon}>
                          <i className={`fa-solid ${link.icon}`} />
                        </span>
                        {!collapsed && <span>{link.label}</span>}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <button type="button" className={styles.logoutBtn} onClick={handleLogout} title="Sign out">
            <span className={styles.navIcon}>
              <i className="fa-solid fa-power-off" />
            </span>
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              type="button"
              className={styles.mobileMenuBtn}
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <i className="fa-solid fa-bars" />
            </button>
            <div>
              <div className={styles.platformLabel}>Platform</div>
              <h1 className={styles.pageTitle}>{getPageTitle()}</h1>
            </div>
          </div>
          <div className={styles.topbarActions}>
            <span className={styles.roleIndicator}>Super Admin</span>
            <NotificationPanel />
            <div className={styles.adminProfile}>
              <div className={styles.avatar}>{initials}</div>
              <span className={styles.adminName}>
                {user.firstName} {user.lastName}
              </span>
            </div>
          </div>
        </header>
        <div className={styles.pageBody}>{children}</div>
      </main>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { OwnerPlanProvider, useOwnerPlan } from '@/lib/owner-plan-context';
import { OrgLocaleProvider } from '@/lib/org-locale-context';
import { hasFeature } from '@/lib/plan';
import { apiFetch } from '@/lib/api';
import NotificationPanel from '@/components/NotificationPanel';
import styles from './business-layout.module.css';
import { BUSINESS_OWNER_NAV, BUSINESS_STAFF_GROUPS, BUSINESS_STAFF_NAV, PROVIDER_BLOCKED_PREFIXES, type NavItem } from '@/lib/nav';

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <OwnerPlanProvider>
      <OrgLocaleProvider>
        <BusinessLayoutInner>{children}</BusinessLayoutInner>
      </OrgLocaleProvider>
    </OwnerPlanProvider>
  );
}

function BusinessLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { plan, loaded: planLoaded } = useOwnerPlan();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Only one menu group is open at a time. Until the user picks one (on this page), the group holding the
  // current page is open; `id: null` means the user closed everything.
  const [openPick, setOpenPick] = useState<{ path: string; id: string | null } | null>(null);
  const [listingMode, setListingMode] = useState<string | null>(user?.listingMode || null);

  // Owners: the sidebar waits until we know this is a business (not an individual) listing,
  // so an individual provider never sees business-only menus, even for a moment.
  const [modeChecked, setModeChecked] = useState(false);

  const isStaff = user?.role === 'BUSINESS_STAFF';
  const navGroups = isStaff ? BUSINESS_STAFF_GROUPS : BUSINESS_OWNER_NAV;

  const toProvider = useMemo(
    () => () => {
      const mapped = pathname.replace(/^\/business/, '/provider').replace('/onboarding/individual', '/onboarding');
      router.replace(mapped === '/provider' || PROVIDER_BLOCKED_PREFIXES.some((p) => mapped.startsWith(p)) ? '/provider/dashboard' : mapped);
    },
    [pathname, router]
  );

  useEffect(() => {
    if (user?.role !== 'BUSINESS_OWNER') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModeChecked(true);
      return;
    }
    if (pathname.startsWith('/business/onboarding') || pathname.startsWith('/business/register')) {
      setModeChecked(true);
    }
    // Solo providers belong in /provider. /api/users/me says which kind of account this is.
    apiFetch<{ listingMode?: string }>('/api/users/me')
      .then((me) => {
        const mode = me.listingMode || null;
        setListingMode(mode);
        if (mode === 'INDIVIDUAL') {
          toProvider();
          return;
        }
        setModeChecked(true);
      })
      .catch(() => {
        setListingMode(null);
        setModeChecked(true);
      });
  }, [user?.role, pathname, toProvider]);

  useEffect(() => {
    if (user?.role === 'BUSINESS_OWNER' && user?.listingMode === 'INDIVIDUAL') toProvider();
  }, [user?.role, user?.listingMode, toProvider]);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/auth/login');
      } else if (user?.role !== 'BUSINESS_OWNER' && user?.role !== 'BUSINESS_STAFF') {
        router.push('/profile/explore');
      } else if (isStaff) {
        const allowed = BUSINESS_STAFF_NAV.some((l) => pathname.startsWith(l.href));
        if (!allowed && pathname !== '/business/register') {
          router.replace('/business/bookings');
        }
      }
    }
  }, [loading, isAuthenticated, user, router, pathname, isStaff]);

  if (
    loading ||
    !isAuthenticated ||
    (user?.role !== 'BUSINESS_OWNER' && user?.role !== 'BUSINESS_STAFF') ||
    (!isStaff && (!modeChecked || listingMode === 'INDIVIDUAL' || user?.listingMode === 'INDIVIDUAL'))
  ) {
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
          style={{ width: '40px', height: '40px', borderTopColor: 'var(--accent-primary)', borderWidth: '4px' }}
        />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const flatLeaves = navGroups.flatMap((g) => g.children);

  // The most specific menu item wins (so /business/reports/team is "Team", not "Performance").
  const activeHref = flatLeaves
    .filter((l) => (l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const getPageTitle = () => {
    const match = flatLeaves.find((l) => l.href === activeHref);
    if (pathname.startsWith('/business/reports')) return `Reports · ${match?.label || 'Performance'}`;
    return match?.label || 'Business';
  };

  const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`;

  const renderLeaf = (link: NavItem, forceShowLabel = false) => {
    const locked = !!link.entitlement && planLoaded && !hasFeature(plan, link.entitlement);
    return (
      <Link
        key={link.href}
        href={link.href}
        className={`${styles.navItem} ${styles.navChild} ${link.href === activeHref ? styles.navActive : ''} ${locked ? styles.navLocked : ''}`}
        onClick={() => setMobileOpen(false)}
      >
        <span className={styles.navIcon}>
          <i className={`fa-solid ${link.icon}`}></i>
        </span>
        {(!collapsed || forceShowLabel) && <span>{link.label}</span>}
        {(!collapsed || forceShowLabel) && locked && (
          <i className={`fa-solid fa-lock ${styles.navLock}`} aria-label="Upgrade required" />
        )}
      </Link>
    );
  };

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
            background: 'var(--overlay)',
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
                src="/duemet-logo-nav-white.png"
                alt="Duemet Logo"
                style={{ height: 26, width: 'auto', objectFit: 'contain', display: 'block' }}
              />
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
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
            >
              <i className="fa-solid fa-angles-left"></i>
            </button>
          )}
        </div>

        <nav className={styles.sidebarNav}>
          {navGroups.map((group) => {
                const picked = openPick && openPick.path === pathname ? openPick.id : undefined;
                const open = !collapsed && (picked === undefined
                  ? group.children.some((child) => pathname.startsWith(child.href))
                  : picked === group.id);
                const shouldRenderChildren = collapsed || open;
                return (
                  <div key={group.id} className={`${styles.navGroup} ${open ? styles.navGroupOpen : ''}`}>
                    <button
                      type="button"
                      className={styles.navGroupBtn}
                      onClick={() =>
                        !collapsed && setOpenPick({ path: pathname, id: open ? null : group.id })
                      }
                      title={group.label}
                    >
                      <span className={styles.navIcon}>
                        <i className={`fa-solid ${group.icon}`}></i>
                      </span>
                      {!collapsed && <span>{group.label}</span>}
                      {!collapsed && (
                        <i
                          className={`fa-solid fa-chevron-${open ? 'down' : 'right'} ${styles.navChevron}`}
                        />
                      )}
                    </button>
                    {shouldRenderChildren && (
                      <div className={`${styles.navChildren} ${open ? styles.navChildrenOpen : ''}`}>
                        {group.children.map((child) => renderLeaf(child, collapsed))}
                      </div>
                    )}
                  </div>
                );
              })}
        </nav>

        <div className={styles.sidebarFooter}>
          <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
            <span className={styles.navIcon}>
              <i className="fa-solid fa-right-from-bracket"></i>
            </span>
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
            <Link href="/community" target="_blank" className={styles.roleSwitchBtn} title="Open the Duemet Community in a new tab">
              <i className="fa-solid fa-people-group"></i>
              <span>Community</span>
            </Link>
            {!isStaff && (
              <Link href="/profile" className={styles.roleSwitchBtn} title="Switch to customer view">
                <i className="fa-solid fa-users"></i>
                <span>Customer Mode</span>
              </Link>
            )}

            <NotificationPanel />

            <div className={styles.userProfile}>
              <div className={styles.userAvatar}>{initials}</div>
              <div className={styles.userInfo}>
                <div className={styles.userName}>
                  {user.firstName} {user.lastName}
                </div>
                <div className={styles.userRole}>
                  {user.role === 'BUSINESS_OWNER' ? 'Business Owner' : 'Staff Member'}
                  {!isStaff && plan?.planName && <span className={styles.planChip}>{plan.planName}</span>}
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

'use client';

import React, { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import BrandLogo from '@/components/BrandLogo';
import HeaderNav from '@/components/HeaderNav';
import NotificationPanel from '@/components/NotificationPanel';
import PageMotion from '@/components/PageMotion';
import { loginHref, registerHref } from '@/lib/auth-redirect';
import { apiFetch } from '@/lib/api';
import styles from './profile-layout.module.css';
import { CUSTOMER_MOBILE_NAV as MOBILE_NAV, CUSTOMER_NAV, CUSTOMER_SIDEBAR, GUEST_NAV, type NavItem } from '@/lib/nav';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [providerWorkspace, setProviderWorkspace] = useState(user?.role === 'BUSINESS_OWNER');
  const [listingMode, setListingMode] = useState<string | null>(user?.listingMode || null);
  const [providerIntent, setProviderIntent] = useState<string | null>(user?.providerIntent || null);
  // Only one sidebar group is open at a time; until one is picked (on this page) the current page's group is open.
  const [openPick, setOpenPick] = useState<{ path: string; id: string | null } | null>(null);

  const isActive = (href: string, exact?: boolean) => {
    if (href.startsWith('/#')) return false;
    if (exact) return pathname === href;
    if (href === '/profile/explore') {
      return (
        pathname === href ||
        pathname.startsWith('/profile/explore') ||
        pathname.startsWith('/profile/business') ||
        // The booking flow (/profile/book/...), not My bookings (/profile/bookings).
        pathname.startsWith('/profile/book/')
      );
    }
    if (href === '/profile') return pathname === '/profile';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleLogout = () => {
    logout();
    router.push('/profile/explore');
  };

  const sideLink = (item: NavItem, child = false) => (
    <Link
      key={item.href}
      href={item.href}
      className={`${styles.sideLink} ${child ? styles.sideChild : ''} ${isActive(item.href, item.exact) ? styles.sideLinkActive : ''}`}
      onClick={() => setMenuOpen(false)}
      aria-label={item.label}
    >
      <span className={styles.sideLinkIcon}>
        <i className={`fa-solid ${item.icon}`} aria-hidden />
      </span>
      {!sidebarCollapsed && <span>{item.label}</span>}
      <span className={styles.sideTip} role="tooltip">
        {item.label}
      </span>
    </Link>
  );

  useEffect(() => {
    if (!isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO derive this instead of syncing it into state (one extra render, not a bug)
      setProviderWorkspace(false);
      return;
    }
    apiFetch<{ providerWorkspace?: boolean; listingMode?: string; providerIntent?: string }>('/api/users/me')
      .then((me) => {
        setProviderWorkspace(Boolean(me.providerWorkspace) || user?.role === 'BUSINESS_OWNER' || me.providerIntent === 'INDIVIDUAL');
        setListingMode(me.listingMode || user?.listingMode || null);
        setProviderIntent(me.providerIntent || user?.providerIntent || null);
      })
      .catch(() => setProviderWorkspace(user?.role === 'BUSINESS_OWNER'));
  }, [isAuthenticated, user?.role, user?.listingMode, user?.providerIntent]);

  if (loading) {
    return (
      <div className={styles.loadingShell}>
        <div className={styles.loadingInner}>
          <SkeletonBar />
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`;
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    const isExplore = pathname.startsWith('/profile/explore');

    return (
      <div className={styles.dash}>
        {menuOpen && (
          <button type="button" className={styles.backdrop} aria-label="Close menu" onClick={() => setMenuOpen(false)} />
        )}
        <aside
          className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ''} ${menuOpen ? styles.sidebarOpen : ''}`}
        >
          <div className={styles.sidebarHeader}>
            {!sidebarCollapsed ? (
              <Link href="/" className={styles.sideBrand}>
                <BrandLogo kind="wordmark" variant="white" height={26} priority className={styles.sideLogo} />
              </Link>
            ) : (
              <Link href="/" className={styles.sideBrandIcon} title="Duemet home">
                <i className="fa-solid fa-calendar-check" />
              </Link>
            )}
            <button
              type="button"
              className={styles.sideToggle}
              onClick={() => setSidebarCollapsed((v) => !v)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <i className={`fa-solid ${sidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`} />
            </button>
          </div>
          <nav className={styles.sideNav} aria-label="Customer">
            {sidebarCollapsed
              ? CUSTOMER_NAV.map((item) => sideLink(item))
              : CUSTOMER_SIDEBAR.map((entry) => {
                  if (!('children' in entry)) return sideLink(entry);
                  const picked = openPick && openPick.path === pathname ? openPick.id : undefined;
                  const open = picked === undefined
                    ? entry.children.some((c) => isActive(c.href, c.exact))
                    : picked === entry.id;
                  return (
                    <div key={entry.id} className={`${styles.sideGroup} ${open ? styles.sideGroupOpen : ''}`}>
                      <button type="button" className={styles.sideGroupBtn} aria-expanded={open}
                        onClick={() => setOpenPick({ path: pathname, id: open ? null : entry.id })}>
                        <span className={styles.sideLinkIcon}><i className={`fa-solid ${entry.icon}`} aria-hidden /></span>
                        <span>{entry.label}</span>
                        <i className={`fa-solid fa-chevron-${open ? 'down' : 'right'} ${styles.sideChevron}`} aria-hidden />
                      </button>
                      {open && <div className={styles.sideChildren}>{entry.children.map((c) => sideLink(c, true))}</div>}
                    </div>
                  );
                })}
          </nav>
          <button type="button" className={styles.sideLogout} onClick={handleLogout} aria-label="Sign out">
            <i className="fa-solid fa-right-from-bracket" />
            {!sidebarCollapsed && <span>Sign out</span>}
            <span className={styles.sideTip} role="tooltip">
              Sign out
            </span>
          </button>
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
              {(user.role === 'BUSINESS_OWNER' || providerWorkspace || providerIntent === 'INDIVIDUAL') && (
                <Link
                  href={
                    listingMode === 'INDIVIDUAL' || providerIntent === 'INDIVIDUAL'
                      ? (listingMode === 'INDIVIDUAL' ? '/provider/dashboard' : '/provider/onboarding')
                      : '/business/dashboard'
                  }
                  className={styles.businessSwitch}
                >
                  <i className="fa-solid fa-briefcase" />
                  <span>Provider mode</span>
                </Link>
              )}
              <Link href="/community" target="_blank" className={styles.businessSwitch} title="Open the Duemet Community in a new tab">
                <i className="fa-solid fa-people-group" />
                <span>Community</span>
              </Link>
              <Link
                href="/profile/favorites"
                className={`${styles.topIconBtn} ${pathname.startsWith('/profile/favorites') ? styles.topIconBtnOn : ''}`}
                aria-label="Saved favorites"
                title="Saved"
              >
                <i className="fa-solid fa-heart" aria-hidden />
              </Link>
              <NotificationPanel />
              <div className={styles.userWrap}>
                <button type="button" className={styles.userBtn} onClick={() => setUserOpen((v) => !v)}>
                  <span className={styles.avatar}>{initials || 'U'}</span>
                  <span className={styles.userMeta}>
                    <strong>{fullName}</strong>
                    <em>{(user.role || 'CUSTOMER').replaceAll('_', ' ')}</em>
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
          <div className={isExplore ? styles.dashBodyFill : styles.dashBody}>
            <PageMotion>{children}</PageMotion>
          </div>
          <nav className={styles.bottomNav} aria-label="Customer">
            {MOBILE_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.bottomLink} ${isActive(item.href, item.exact) ? styles.bottomLinkOn : ''}`}
              >
                <i className={`fa-solid ${item.icon}`} aria-hidden />
                <span>{item.short}</span>
              </Link>
            ))}
            <button type="button" className={styles.bottomLink} onClick={() => setMenuOpen(true)}>
              <i className="fa-solid fa-ellipsis" aria-hidden />
              <span>More</span>
            </button>
          </nav>
        </div>
      </div>
    );
  }

  const isGuestBrowseRoute =
    pathname.startsWith('/profile/explore') ||
    pathname.startsWith('/profile/business') ||
    pathname.startsWith('/profile/book');

  return (
    <div className={styles.shell}>
      <header className={`app-header ${styles.header}`}>
        <div
          className={`${styles.headerInner} ${pathname.startsWith('/profile/explore') ? styles.headerInnerWide : ''}`}
        >
          <div className={styles.left}>
            <button
              type="button"
              className={styles.guestMenuBtn}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <i className="fa-solid fa-bars" />
            </button>
            <Link href="/" className={styles.brand}>
              <BrandLogo kind="wordmark" variant="color" height={28} priority className={styles.logo} />
            </Link>
            <nav className={styles.nav} aria-label="Customer">
              {GUEST_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  {...(item.external ? { target: '_blank' } : {})}
                  className={`${styles.navLink} ${isActive(item.href) ? styles.navActive : ''}`}
                >
                  <i className={`fa-solid ${item.icon}`} aria-hidden />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className={styles.right}>
            <Suspense fallback={null}>
              <HeaderNav />
            </Suspense>
          </div>
        </div>
      </header>

      {menuOpen && (
        <>
          <button type="button" className={styles.guestMenuBackdrop} aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <nav className={styles.guestMenuSheet} aria-label="Mobile">
            <div className={styles.guestMenuHead}>
              <strong>Duemet</strong>
              <button type="button" className={styles.guestMenuClose} aria-label="Close" onClick={() => setMenuOpen(false)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            {GUEST_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                {...(item.external ? { target: '_blank' } : {})}
                className={`${styles.guestMenuLink} ${isActive(item.href) ? styles.guestMenuLinkOn : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                <i className={`fa-solid ${item.icon}`} aria-hidden />
                {item.label}
              </Link>
            ))}
            <Link href={loginHref(pathname)} className={styles.guestMenuLink} onClick={() => setMenuOpen(false)}>
              <i className="fa-solid fa-right-to-bracket" aria-hidden /> Sign in
            </Link>
            <Link href={registerHref(pathname)} className={styles.guestMenuCta} onClick={() => setMenuOpen(false)}>
              Create account
            </Link>
          </nav>
        </>
      )}

      <main
        className={
          pathname.startsWith('/profile/explore')
            ? styles.mainFlush
            : isGuestBrowseRoute
              ? styles.mainWide
              : styles.main
        }
      >
        <PageMotion>{children}</PageMotion>
      </main>

      <footer className={styles.guestFooter}>
        <div className={styles.guestFooterInner}>
          <div className={styles.guestFooterMain}>
            <div className={styles.guestFooterBrand}>
              <Link href="/" className={styles.guestFooterLogo}>
                <BrandLogo kind="wordmark" variant="white" height={28} className={styles.logo} />
              </Link>
              <p>
                The live marketplace for local services — browse businesses, compare packages, and book real open
                slots.
              </p>
              <div className={styles.guestFooterSocials}>
                <a href="mailto:support@duemet.app" aria-label="Email support">
                  <i className="fa-solid fa-envelope" />
                </a>
                <Link href="/profile/explore" aria-label="Explore marketplace">
                  <i className="fa-solid fa-compass" />
                </Link>
                <Link href="/#faq" aria-label="FAQ">
                  <i className="fa-solid fa-circle-question" />
                </Link>
              </div>
            </div>

            <div className={styles.guestFooterCols}>
              <div className={styles.guestFooterCol}>
                <h4>Marketplace</h4>
                <ul>
                  <li><Link href="/profile/explore">Explore businesses</Link></li>
                  <li><Link href="/profile/explore">Search by category</Link></li>
                  <li><Link href="/">Duemet home</Link></li>
                </ul>
              </div>
              <div className={styles.guestFooterCol}>
                <h4>Your account</h4>
                <ul>
                  <li><Link href={loginHref(pathname)}>Sign in</Link></li>
                  <li><Link href={registerHref(pathname)}>Create account</Link></li>
                  <li><Link href={registerHref(pathname, 'individual')}>List as individual</Link></li>
                  <li><Link href={registerHref(pathname, 'business')}>List your business</Link></li>
                </ul>
              </div>
              <div className={styles.guestFooterCol}>
                <h4>Learn more</h4>
                <ul>
                  <li><Link href="/#how-it-works">How it works</Link></li>
                  <li><Link href="/#pricing">Pricing</Link></li>
                  <li><Link href="/#faq">FAQ</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className={styles.guestFooterBottom}>
            <p>© {new Date().getFullYear()} Duemet. All rights reserved.</p>
            <div className={styles.guestFooterLinks}>
              <Link href="/">Home</Link>
              <Link href="/profile/explore">Explore</Link>
              <a href="mailto:support@duemet.app">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SkeletonBar() {
  return (
    <>
      <div className={styles.skeletonLine} style={{ width: '40%', height: 28 }} />
      <div className={styles.skeletonLine} style={{ width: '100%', height: 120, marginTop: 24 }} />
    </>
  );
}

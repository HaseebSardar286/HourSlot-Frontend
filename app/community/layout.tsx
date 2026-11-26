'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import BrandLogo from '@/components/BrandLogo';
import NotificationPanel from '@/components/NotificationPanel';
import { useAuth } from '@/lib/auth-context';
import { loginHref, registerHref } from '@/lib/auth-redirect';
import { initials, tone } from '@/components/community/types';
import styles from './community.module.css';

/** Where "Back to Duemet" goes for each kind of account. */
function homeFor(user: { role?: string; listingMode?: string | null } | null) {
  if (!user) return '/profile/explore';
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return '/admin';
  if (user.role === 'BUSINESS_STAFF') return '/business/bookings';
  if (user.role === 'BUSINESS_OWNER') return user.listingMode === 'INDIVIDUAL' ? '/provider/dashboard' : '/business/dashboard';
  return '/profile/explore';
}

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(false);
  const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : '';

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.topInner}>
          <Link href="/community" className={styles.brand} aria-label="Duemet Community home">
            <BrandLogo kind="wordmark" variant="color" height={26} priority />
            <span className={styles.brandTag}>Community</span>
          </Link>

          <form
            className={styles.topSearch}
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(q.trim() ? `/community?q=${encodeURIComponent(q.trim())}` : '/community');
            }}
          >
            <i className="fa-solid fa-magnifying-glass" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search posts, reviews and questions" aria-label="Search the community" />
          </form>

          <div className={styles.topActions}>
            <Link href={homeFor(user)} className={styles.backLink} title="Back to Duemet">
              <i className="fa-solid fa-arrow-left" aria-hidden /> <span>Back to Duemet</span>
            </Link>
            {isAuthenticated && user ? (
              <>
                <NotificationPanel />
                <div className={styles.menuWrap}>
                  <button type="button" className={styles.meBtn} onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-label="Account menu">
                    <span className={styles.avatarSm} style={{ background: tone(name) }}>{initials(name)}</span>
                  </button>
                  {menu && (
                    <>
                      <button type="button" className={styles.menuScrim} aria-label="Close menu" onClick={() => setMenu(false)} />
                      <div className={styles.menu} role="menu">
                        <div className={styles.menuHead}>
                          <strong>{name}</strong>
                          <em>{user.email}</em>
                        </div>
                        <Link href={`/community?author=me`} role="menuitem" onClick={() => setMenu(false)}>
                          <i className="fa-solid fa-user" /> My posts
                        </Link>
                        <Link href={homeFor(user)} role="menuitem" onClick={() => setMenu(false)}>
                          <i className="fa-solid fa-gauge" /> My Duemet
                        </Link>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMenu(false);
                            logout();
                            router.push('/community');
                          }}
                        >
                          <i className="fa-solid fa-right-from-bracket" /> Sign out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href={loginHref(pathname)} className="btn btn-outline btn-sm">Sign in</Link>
                <Link href={registerHref(pathname)} className={`btn btn-primary btn-sm ${styles.hideSm}`}>Join</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}

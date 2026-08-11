'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import HeaderNav from '@/components/HeaderNav';
import { apiFetch } from '@/lib/api';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    apiFetch<{ unreadCount: number }>('/api/notifications')
      .then((data) => setUnread(data?.unreadCount || 0))
      .catch(() => setUnread(0));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <header className="app-header" style={{ position: 'sticky', top: 0, zIndex: 1000, backgroundColor: '#ffffff', borderBottom: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div className="header-container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <Link href="/profile/explore" className="logo-area" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Image src="/logo-hourslot.png" alt="HourSlot" width={120} height={36} style={{ objectFit: 'contain' }} />
            </Link>
          </div>

          <nav className="nav-links" style={{ display: 'flex', gap: '24px' }}>
            <Link className="nav-link" href="/profile/explore">Explore</Link>
            <Link className="nav-link" href="/profile/bookings">Appointments</Link>
            <Link className="nav-link" href="/profile/favorites">Favorites</Link>
            <Link className="nav-link" href="/profile">Account</Link>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Link
              href="/profile/bookings"
              aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer', position: 'relative' }}
            >
              <i className="fa-regular fa-bell"></i>
              {unread > 0 && (
                <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', background: 'var(--accent-red)', borderRadius: '50%' }} />
              )}
            </Link>
            <HeaderNav />
          </div>
        </div>
      </header>

      <main className="app-main" style={{ flex: '1 0 auto', width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '40px 24px', boxSizing: 'border-box' }}>
        {children}
      </main>

      <footer className="app-footer" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: '#ffffff', padding: '24px 0', width: '100%', flexShrink: 0 }}>
        <div className="footer-container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '12px' }}>
          <p>© 2026 HourSlot. Smart booking solutions.</p>
          <div className="footer-links" style={{ display: 'flex', gap: '20px' }}>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

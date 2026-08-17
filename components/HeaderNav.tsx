'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

/**
 * Header navigation — client component that renders auth-aware buttons.
 * Matches the light teal/green HourSlot theme.
 */
export default function HeaderNav() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    // Clear the middleware cookie too
    document.cookie = 'hourslot_user_session=; path=/; max-age=0';
    logout();
    router.push('/');
  };

  if (isAuthenticated && user) {
    const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`;

    return (
      <div className="auth-area">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1a8a8a, #5bb88c)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-headers)',
            fontSize: '0.78rem',
            fontWeight: 700,
          }}>
            {initials}
          </div>
          <span style={{
            color: 'var(--text-secondary)',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}>
            {user.firstName}
          </span>
        </div>

        {(user.role === 'BUSINESS_OWNER' || user.role === 'BUSINESS_STAFF') && (
          <Link href="/business/dashboard" className="btn btn-secondary">
            Dashboard
          </Link>
        )}
        {user.role === 'SUPER_ADMIN' && (
          <Link href="/admin/dashboard" className="btn btn-secondary">
            Admin
          </Link>
        )}
        <button className="btn btn-outline" onClick={handleLogout} style={{ padding: '8px 18px' }}>
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="auth-area">
      <Link href="/auth/login" className="btn btn-secondary">
        Sign In
      </Link>
      <Link href="/auth/register" className="btn btn-primary">
        Get Started
      </Link>
    </div>
  );
}

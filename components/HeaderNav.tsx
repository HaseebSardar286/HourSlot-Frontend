'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

/**
 * Header navigation — client component that renders auth-aware buttons.
 * Replaces the static Angular header buttons.
 */
export default function HeaderNav() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    // Clear the middleware cookie too
    document.cookie = 'hourslot_user_session=; path=/; max-age=0';
    logout();
    router.push('/auth/login');
  };

  if (isAuthenticated && user) {
    return (
      <div className="auth-area">
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {user.firstName} {user.lastName}
        </span>
        {(user.role === 'BUSINESS_ADMIN' || user.role === 'BUSINESS_STAFF') && (
          <Link href="/business/dashboard" className="btn btn-secondary">
            Dashboard
          </Link>
        )}
        <Link href="/profile" className="btn btn-secondary">
          Profile
        </Link>
        <button className="btn btn-primary" onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="auth-area">
      <Link href="/business/register" className="btn btn-secondary">
        Business Registration
      </Link>
      <Link href="/auth/login" className="btn btn-primary">
        Login / Register
      </Link>
    </div>
  );
}

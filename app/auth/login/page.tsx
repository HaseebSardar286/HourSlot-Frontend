'use client';

import { useState, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import styles from './login.module.css';

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailError = touched.email && !email ? 'Email is required.' :
    touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Please enter a valid email.' : null;
  const passwordError = touched.password && !password ? 'Password is required.' :
    touched.password && password.length < 6 ? 'Password must be at least 6 characters.' : null;

  const getDashboardRoute = (role: string): string => {
    switch (role) {
      case 'PLATFORM_ADMIN': return '/admin/dashboard';
      case 'BUSINESS_ADMIN':
      case 'BUSINESS_STAFF': return '/business/dashboard';
      default: return '/profile';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (emailError || passwordError || !email || !password) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const session = await login({ email, password });

      // Set session cookie for middleware
      document.cookie = `hourslot_user_session=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=86400`;

      const returnUrl = searchParams.get('returnUrl') || getDashboardRoute(session.role);
      router.push(returnUrl);
    } catch (err: unknown) {
      const e = err as { error?: { message?: string } };
      setErrorMessage(e?.error?.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className={`glass-card ${styles.authCard}`}>
      <div className={styles.authHeader}>
        <span className={styles.authLogoIcon}>⏳</span>
        <h2>Welcome Back</h2>
        <p className={styles.authSubtitle}>Sign in to manage your appointments</p>
      </div>

      {errorMessage && (
        <div className="error-alert">
          <span>⚠️</span> {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
        <div className="form-group">
          <label htmlFor="email" className="form-label">Email Address</label>
          <input
            id="email"
            type="email"
            className={`input-field${emailError ? ' input-error' : ''}`}
            placeholder="name@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          />
          {emailError && <span className="validation-error">{emailError}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">Password</label>
          <input
            id="password"
            type="password"
            className={`input-field${passwordError ? ' input-error' : ''}`}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          />
          {passwordError && <span className="validation-error">{passwordError}</span>}
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? <><span className="spinner" /> Logging in...</> : 'Sign In'}
        </button>
      </form>

      <div className={styles.authFooter}>
        <p>Don&apos;t have an account? <Link href="/auth/register">Create one</Link></p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className={styles.authContainer}>
      <Suspense fallback={
        <div className={`glass-card ${styles.authCard}`}>
          <div className={styles.authHeader}>
            <span className={styles.authLogoIcon}>⏳</span>
            <h2>Welcome Back</h2>
            <p className={styles.authSubtitle}>Loading authentication...</p>
          </div>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}

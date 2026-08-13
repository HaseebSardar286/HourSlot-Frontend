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
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailError =
    touched.email && !email
      ? 'Email is required.'
      : touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? 'Please enter a valid email.'
        : null;
  const passwordError =
    touched.password && !password
      ? 'Password is required.'
      : touched.password && password.length < 6
        ? 'Password must be at least 6 characters.'
        : null;

  const getDashboardRoute = (role: string): string => {
    switch (role) {
      case 'SUPER_ADMIN':
        return '/admin/dashboard';
      case 'BUSINESS_OWNER':
      case 'BUSINESS_STAFF':
        return '/business/dashboard';
      default:
        return '/profile/explore';
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
      document.cookie = `hourslot_user_session=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=86400`;
      const returnUrl = searchParams.get('returnUrl') || getDashboardRoute(session.role);
      router.push(returnUrl);
    } catch (err: unknown) {
      const e = err as { error?: { message?: string }; message?: string };
      setErrorMessage(e?.error?.message || e?.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className={`surface ${styles.authCard}`}>
      <div className={styles.authHeader}>
        <h2 className={styles.authTitle}>Welcome back</h2>
        <p className={styles.authSubtitle}>Sign in to manage your appointments</p>
      </div>

      {errorMessage && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" /> {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
        <div className="form-group">
          <label htmlFor="login-email" className="form-label">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            className={`input-field${emailError ? ' input-error' : ''}`}
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            autoComplete="email"
          />
          {emailError && <span className="validation-error">{emailError}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="login-password" className="form-label">
            Password
          </label>
          <div className={styles.passwordWrapper}>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className={`input-field${passwordError ? ' input-error' : ''}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              autoComplete="current-password"
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
            </button>
          </div>
          {passwordError && <span className="validation-error">{passwordError}</span>}
        </div>

        <div className={styles.formMeta}>
          <span />
          <Link href="/auth/forgot-password" className={styles.forgotLink}>
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" /> Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <div className={styles.authFooter}>
        <p>
          Don&apos;t have an account? <Link href="/auth/register">Create one</Link>
        </p>
        <p style={{ marginTop: 8 }}>
          <Link href="/">← Back to HourSlot</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="surface" style={{ padding: 24, textAlign: 'center' }}>
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

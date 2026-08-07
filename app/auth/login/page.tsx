'use client';

import { useState, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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

  const emailError = touched.email && !email ? 'Email is required.' :
    touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Please enter a valid email.' : null;
  const passwordError = touched.password && !password ? 'Password is required.' :
    touched.password && password.length < 6 ? 'Password must be at least 6 characters.' : null;

  const getDashboardRoute = (role: string): string => {
    switch (role) {
      case 'SUPER_ADMIN': return '/admin/dashboard';
      case 'BUSINESS_OWNER':
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
      <div className={styles.authLogo}>
        <Image
          src="/logo-hourslot.png"
          alt="HourSlot"
          width={180}
          height={56}
          className={styles.authLogoImg}
          priority
        />
      </div>

      <div className={styles.authHeader}>
        <h2 className={styles.authTitle}>Welcome Back</h2>
        <p className={styles.authSubtitle}>Sign in to manage your appointments</p>
      </div>

      {errorMessage && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation"></i> {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
        <div className="form-group">
          <label htmlFor="login-email" className="form-label">Email Address</label>
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
          <label htmlFor="login-password" className="form-label">Password</label>
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
              {showPassword ? (
                <i className="fa-solid fa-eye-slash"></i>
              ) : (
                <i className="fa-solid fa-eye"></i>
              )}
            </button>
          </div>
          {passwordError && <span className="validation-error">{passwordError}</span>}
        </div>

        <div className={styles.formMeta}>
          <label className={styles.rememberLabel}>
            <input type="checkbox" />
            Remember me
          </label>
          <Link href="/auth/forgot-password" className={styles.forgotLink}>
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? <><span className="spinner" /> Signing in...</> : 'Sign In'}
        </button>

        <div className={styles.orDivider}>
          <span className={styles.orDividerText}>or continue with</span>
        </div>

        <div className={styles.socialButtons}>
          <button type="button" className={styles.socialBtn}>
            <i className="fa-brands fa-google" style={{ color: '#ea4335' }}></i>
            Google
          </button>
          <button type="button" className={styles.socialBtn}>
            <i className="fa-brands fa-apple" style={{ color: '#000000' }}></i>
            Apple
          </button>
        </div>
      </form>

      <div className={styles.authFooter}>
        <p>Don&apos;t have an account? <Link href="/auth/register">Create one</Link></p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <div className="auth-page-bg" />
      <div className={styles.authWrapper}>
        <Suspense fallback={
          <div className={`glass-card ${styles.authCard}`}>
            <div className={styles.authHeader}>
              <h2 className={styles.authTitle}>Welcome Back</h2>
              <p className={styles.authSubtitle}>Loading...</p>
            </div>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </>
  );
}

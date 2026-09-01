'use client';

import { useState, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { destinationAfterAuth } from '@/lib/auth-redirect';
import shared from '../auth-shared.module.css';

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

  const returnUrlRaw = searchParams.get('returnUrl');
  const isBookingReturn = Boolean(returnUrlRaw?.includes('/profile/book/'));

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (emailError || passwordError || !email || !password) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const session = await login({ email, password });
      document.cookie = `hourslot_user_session=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=86400`;
      router.push(destinationAfterAuth(session.role, searchParams.get('returnUrl')));
    } catch (err: unknown) {
      const e = err as { error?: { message?: string }; message?: string };
      setErrorMessage(e?.error?.message || e?.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className={shared.authCard}>
      <div className={shared.authHeader}>
        <div className={shared.authHeaderIcon}>
          <i className={`fa-solid ${isBookingReturn ? 'fa-calendar-check' : 'fa-right-to-bracket'}`} />
        </div>
        <h2 className={shared.authTitle}>{isBookingReturn ? 'Complete your booking' : 'Welcome back'}</h2>
        <p className={shared.authSubtitle}>
          {isBookingReturn
            ? 'Sign in to confirm your appointment. Your selections are saved.'
            : 'Sign in to manage appointments, bookings, and your account.'}
        </p>
      </div>

      {isBookingReturn && (
        <div className={shared.contextBanner}>
          <i className="fa-solid fa-circle-info" />
          <div>
            <strong>Almost there</strong>
            After signing in you&apos;ll return to checkout to confirm your booking.
          </div>
        </div>
      )}

      {errorMessage && (
        <div className={shared.alertError}>
          <i className="fa-solid fa-triangle-exclamation" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={shared.authForm} noValidate>
        <div className={shared.fieldGroup}>
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            type="email"
            className={`${shared.fieldInput}${emailError ? ` ${shared.fieldInputError}` : ''}`}
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            autoComplete="email"
          />
          {emailError && <span className={shared.fieldError}>{emailError}</span>}
        </div>

        <div className={shared.fieldGroup}>
          <label htmlFor="login-password">Password</label>
          <div className={shared.passwordWrap}>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className={`${shared.fieldInput}${passwordError ? ` ${shared.fieldInputError}` : ''}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              autoComplete="current-password"
            />
            <button
              type="button"
              className={shared.passwordToggle}
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
            </button>
          </div>
          {passwordError && <span className={shared.fieldError}>{passwordError}</span>}
        </div>

        <div className={shared.formMeta}>
          <Link href="/auth/forgot-password" className={shared.forgotLink}>
            Forgot password?
          </Link>
        </div>

        <button type="submit" className={shared.submitBtn} disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" /> Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <div className={shared.authFooter}>
        <p>
          Don&apos;t have an account?{' '}
          <Link
            href={
              searchParams.get('returnUrl')
                ? `/auth/register?role=customer&returnUrl=${encodeURIComponent(searchParams.get('returnUrl') || '')}`
                : '/auth/register'
            }
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className={shared.authCard} style={{ textAlign: 'center', padding: 40 }}>
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

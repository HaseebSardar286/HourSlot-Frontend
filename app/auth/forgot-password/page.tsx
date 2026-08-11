'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { apiFetch } from '@/lib/api';
import styles from './forgot.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const emailError = touched && !email ? 'Email is required.' :
    touched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Please enter a valid email.' : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (emailError || !email) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await apiFetch<{ message: string; token?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ email }),
      });
      if (res?.token) setDevToken(res.token);
      setSent(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not start password reset.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <>
        <div className="auth-page-bg" />
        <div className={styles.authWrapper}>
          <div className={`glass-card ${styles.authCard}`}>
            <div className={styles.successState}>
              <span className={styles.successIcon}>
                <i className="fa-solid fa-paper-plane" style={{ color: 'var(--accent-primary)' }}></i>
              </span>
              <h2 className={styles.successTitle}>Check Your Inbox</h2>
              <p className={styles.successMessage}>
                If an account exists for <strong>{email}</strong>, a password reset link was generated.
                In local development the token is also written to the backend logs.
              </p>
              {devToken && (
                <Link href={`/auth/reset-password?token=${devToken}`} className="btn btn-primary btn-block" style={{ marginBottom: 12 }}>
                  Continue with reset token
                </Link>
              )}
              <Link href="/auth/login" className="btn btn-secondary btn-block">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="auth-page-bg" />
      <div className={styles.authWrapper}>
        <div className={`glass-card ${styles.authCard}`}>
          <div className={styles.authLogo}>
            <Image
              src="/logo-hourslot.png"
              alt="HourSlot"
              width={150}
              height={48}
              className={styles.authLogoImg}
              priority
            />
          </div>

          <div style={{ textAlign: 'center', margin: '20px 0 10px' }}>
            <i className="fa-solid fa-lock" style={{ fontSize: '3rem', color: 'var(--accent-primary)' }}></i>
          </div>

          <div className={styles.authHeader}>
            <h2 className={styles.authTitle}>Forgot Password?</h2>
            <p className={styles.authSubtitle}>
              Enter your email and we&apos;ll generate a reset link for your HourSlot account.
            </p>
          </div>

          {errorMessage && (
            <div className="error-alert">
              <i className="fa-solid fa-triangle-exclamation"></i> {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
            <div className="form-group">
              <label htmlFor="forgot-email" className="form-label">Email Address</label>
              <input
                id="forgot-email"
                type="email"
                className={`input-field${emailError ? ' input-error' : ''}`}
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(true)}
                autoComplete="email"
              />
              {emailError && <span className="validation-error">{emailError}</span>}
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? <><span className="spinner" /> Sending...</> : 'Send Reset Link'}
            </button>
          </form>

          <Link href="/auth/login" className={styles.backLink}>
            ← Back to Login
          </Link>
        </div>
      </div>
    </>
  );
}

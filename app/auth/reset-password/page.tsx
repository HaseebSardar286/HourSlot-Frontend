'use client';

import { FormEvent, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import styles from '../forgot-password/forgot.module.css';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError('Reset token is required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ token, newPassword: password }),
      });
      setDone(true);
      setTimeout(() => router.push('/auth/login'), 1500);
    } catch (err: any) {
      setError(err?.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`surface ${styles.authCard}`}>
      <div className={styles.authHeader}>
        <h2 className={styles.authTitle}>Reset password</h2>
        <p className={styles.authSubtitle}>Choose a new password for your HourSlot account.</p>
      </div>

      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}
      {done && <div className="success-alert">Password updated. Redirecting to login…</div>}

      <form onSubmit={handleSubmit} className={styles.authForm}>
        <div className="form-group">
          <label className="form-label" htmlFor="reset-token">
            Reset token
          </label>
          <input
            id="reset-token"
            className="input-field"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="reset-pass">
            New password
          </label>
          <input
            id="reset-pass"
            type="password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="reset-confirm">
            Confirm password
          </label>
          <input
            id="reset-confirm"
            type="password"
            className="input-field"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={loading || done}>
          {loading ? 'Saving…' : 'Update password'}
        </button>
      </form>
      <Link href="/auth/login" className={styles.backLink}>
        ← Back to login
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="surface" style={{ padding: 24, textAlign: 'center' }}>
          Loading…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

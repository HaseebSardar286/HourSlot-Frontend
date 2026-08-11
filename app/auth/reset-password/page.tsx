'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import styles from '../forgot-password/forgot.module.css';

export default function ResetPasswordPage() {
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
    <>
      <div className="auth-page-bg" />
      <div className={styles.authWrapper}>
        <div className={`glass-card ${styles.authCard}`}>
          <div className={styles.authLogo}>
            <Image src="/logo-hourslot.png" alt="HourSlot" width={150} height={48} priority />
          </div>
          <div className={styles.authHeader}>
            <h2 className={styles.authTitle}>Reset Password</h2>
            <p className={styles.authSubtitle}>Choose a new password for your HourSlot account.</p>
          </div>

          {error && (
            <div className="error-alert">
              <i className="fa-solid fa-triangle-exclamation"></i> {error}
            </div>
          )}
          {done && (
            <div className="success-alert">Password updated. Redirecting to login…</div>
          )}

          <form onSubmit={handleSubmit} className={styles.authForm}>
            <div className="form-group">
              <label className="form-label" htmlFor="reset-token">Reset token</label>
              <input
                id="reset-token"
                className="input-field"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reset-pass">New password</label>
              <input
                id="reset-pass"
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reset-confirm">Confirm password</label>
              <input
                id="reset-confirm"
                type="password"
                className="input-field"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading || done}>
              {loading ? 'Saving…' : 'Update password'}
            </button>
          </form>
          <Link href="/auth/login" className={styles.backLink}>← Back to Login</Link>
        </div>
      </div>
    </>
  );
}

'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import FormField from '@/components/FormField';
import styles from './accept-invite.module.css';

type Preview = {
  email: string;
  displayName: string;
  designation?: string;
  businessName: string;
  branchName: string;
};

export default function AcceptInviteInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', password: '', phoneNumber: '' });

  useEffect(() => {
    if (!token) {
      setError('Invite token is missing.');
      setLoading(false);
      return;
    }
    apiFetch<Preview>(`/api/auth/staff-invite?token=${encodeURIComponent(token)}`, { skipAuth: true })
      .then((data) => {
        setPreview(data);
        setForm((p) => ({ ...p, firstName: data.displayName?.split(' ')[0] || '' }));
      })
      .catch((err: { message?: string }) => setError(err?.message || 'Invite is invalid or expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch('/api/auth/staff-invite/accept', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ token, ...form }),
      });
      setMessage('Account created. You can sign in now.');
      setTimeout(() => router.push('/auth/login'), 1200);
    } catch (err: unknown) {
      const e2 = err as { message?: string };
      setError(e2?.message || 'Could not accept invite.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={`surface ${styles.card}`}>
        <h1>Accept staff invite</h1>
        {loading && <p>Loading invite…</p>}
        {error && (
          <div className="error-alert">
            <i className="fa-solid fa-triangle-exclamation" /> {error}
          </div>
        )}
        {message && (
          <div className="success-alert">
            <i className="fa-solid fa-circle-check" /> {message}
          </div>
        )}
        {preview && !message && (
          <>
            <p className={styles.meta}>
              Join <strong>{preview.businessName}</strong> at <strong>{preview.branchName}</strong> as{' '}
              {preview.displayName}
              {preview.designation ? ` (${preview.designation})` : ''}.
            </p>
            <p className={styles.meta}>Sign-in email: {preview.email}</p>
            <form onSubmit={onSubmit} className={styles.form}>
              <FormField
                label="First name"
                htmlFor="firstName"
                value={form.firstName}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
              />
              <FormField
                label="Last name"
                htmlFor="lastName"
                value={form.lastName}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
              />
              <FormField
                label="Phone"
                htmlFor="phone"
                value={form.phoneNumber}
                onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
              />
              <FormField
                label="Password"
                htmlFor="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              />
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Creating account…' : 'Accept invite'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

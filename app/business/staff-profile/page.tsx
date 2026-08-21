'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';
import styles from './staff-profile.module.css';

type Staff = {
  id: number;
  name: string;
  designation?: string;
  specialty?: string;
  bio?: string;
  branch?: { id: number; name: string };
};

export default function StaffProfilePage() {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', designation: '', specialty: '', bio: '' });

  useEffect(() => {
    apiFetch<Staff[]>('/api/business/staff')
      .then((rows) => {
        const mine = rows[0];
        if (!mine) {
          setError('No staff profile linked to your account.');
          return;
        }
        setStaff(mine);
        setForm({
          name: mine.name || '',
          designation: mine.designation || '',
          specialty: (mine as Staff).specialty || '',
          bio: (mine as Staff).bio || '',
        });
      })
      .catch((err: { message?: string }) => setError(err?.message || 'Could not load profile.'))
      .finally(() => setLoading(false));
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!staff) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiFetch<Staff>(`/api/business/staff/${staff.id}/profile`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setStaff(updated);
      setMessage('Profile saved.');
    } catch (err: unknown) {
      const e2 = err as { message?: string };
      setError(e2?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="title" />
        <Skeleton variant="card" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader title="My staff profile" subtitle={staff?.branch?.name ? `Branch: ${staff.branch.name}` : undefined} />
      {message && (
        <div className="success-alert">
          <i className="fa-solid fa-circle-check" /> {message}
        </div>
      )}
      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}
      {staff && (
        <form className={`surface ${styles.form}`} onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Display name
            </label>
            <input
              id="name"
              className="input-field"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="designation">
              Designation
            </label>
            <input
              id="designation"
              className="input-field"
              value={form.designation}
              onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="specialty">
              Specialty
            </label>
            <input
              id="specialty"
              className="input-field"
              value={form.specialty}
              onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="bio">
              Bio
            </label>
            <textarea
              id="bio"
              className="input-field"
              rows={4}
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      )}
    </div>
  );
}

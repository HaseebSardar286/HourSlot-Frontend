'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';
import styles from './organization.module.css';

type Org = {
  id: number;
  name: string;
  slug: string;
  billingEmail?: string;
  status: string;
  defaultCurrency: string;
  countryCode?: string;
  timezone?: string;
};

export default function OrganizationPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    billingEmail: '',
    defaultCurrency: 'USD',
    countryCode: '',
    timezone: '',
  });

  useEffect(() => {
    apiFetch<Org>('/api/business/organization')
      .then((data) => {
        setOrg(data);
        setForm({
          name: data.name || '',
          billingEmail: data.billingEmail || '',
          defaultCurrency: data.defaultCurrency || 'USD',
          countryCode: data.countryCode || '',
          timezone: data.timezone || '',
        });
      })
      .catch((err: { message?: string }) => setError(err?.message || 'Could not load organization.'))
      .finally(() => setLoading(false));
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiFetch<Org>('/api/business/organization', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setOrg(updated);
      setMessage('Organization profile saved.');
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
      <PageHeader
        title="Organization"
        subtitle="Billing and tenant settings for your HourSlot account. SaaS plans attach to this organization."
      />
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
      <form className={`surface ${styles.form}`} onSubmit={onSubmit}>
        <div className={styles.meta}>
          <span>Slug: {org?.slug}</span>
          <span>Status: {org?.status}</span>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="orgName">
            Organization name
          </label>
          <input
            id="orgName"
            className="input-field"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="billingEmail">
            Billing email
          </label>
          <input
            id="billingEmail"
            type="email"
            className="input-field"
            value={form.billingEmail}
            onChange={(e) => setForm((p) => ({ ...p, billingEmail: e.target.value }))}
          />
        </div>
        <div className={styles.row}>
          <div className="form-group">
            <label className="form-label" htmlFor="currency">
              Default currency
            </label>
            <input
              id="currency"
              className="input-field"
              value={form.defaultCurrency}
              onChange={(e) => setForm((p) => ({ ...p, defaultCurrency: e.target.value.toUpperCase() }))}
              maxLength={3}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="country">
              Country code
            </label>
            <input
              id="country"
              className="input-field"
              value={form.countryCode}
              onChange={(e) => setForm((p) => ({ ...p, countryCode: e.target.value.toUpperCase() }))}
              maxLength={2}
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="timezone">
            Timezone
          </label>
          <input
            id="timezone"
            className="input-field"
            value={form.timezone}
            onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save organization'}
        </button>
      </form>
    </div>
  );
}

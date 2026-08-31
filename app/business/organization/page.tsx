'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useOrgLocale } from '@/lib/org-locale-context';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';
import GeoFields, { type GeoSelection } from '@/components/GeoFields';
import styles from './organization.module.css';

type Org = {
  id: number;
  name: string;
  slug: string;
  billingEmail?: string;
  status: string;
  defaultCurrency: string;
  countryCode?: string;
  region?: string;
  city?: string;
  timezone?: string;
};

export default function OrganizationPage() {
  const { refresh } = useOrgLocale();
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [geo, setGeo] = useState<GeoSelection>({
    countryCode: '',
    region: '',
    city: '',
    currency: 'USD',
    timezone: 'UTC',
  });

  useEffect(() => {
    apiFetch<Org>('/api/business/organization')
      .then((data) => {
        setOrg(data);
        setName(data.name || '');
        setBillingEmail(data.billingEmail || '');
        setGeo({
          countryCode: data.countryCode || '',
          region: data.region || '',
          city: data.city || '',
          currency: data.defaultCurrency || 'USD',
          timezone: data.timezone || 'UTC',
        });
      })
      .catch((err: { message?: string }) => setError(err?.message || 'Could not load organization settings.'))
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
        body: JSON.stringify({
          name,
          billingEmail,
          defaultCurrency: geo.currency,
          countryCode: geo.countryCode,
          region: geo.region,
          city: geo.city,
          timezone: geo.timezone,
        }),
      });
      setOrg(updated);
      setGeo({
        countryCode: updated.countryCode || '',
        region: updated.region || '',
        city: updated.city || '',
        currency: updated.defaultCurrency || 'USD',
        timezone: updated.timezone || 'UTC',
      });
      await refresh();
      setMessage('Organization settings saved. Catalog prices now use this currency.');
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
        title="Organization Settings"
        subtitle="Set the country, region, city, and operating currency used across bookings, services, and customer checkout."
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

      <div className={styles.organizationGrid}>
        <div className={`surface ${styles.overviewCard}`}>
          <div className={styles.overviewHeader}>
            <div className={styles.orgIcon}>
              <i className="fa-solid fa-building" />
            </div>
            <div>
              <h3>{org?.name || 'My Organization'}</h3>
              <span className={styles.orgStatus}>
                <i className="fa-solid fa-shield-halved" /> Status: {org?.status || 'Active'}
              </span>
            </div>
          </div>

          <div className={styles.infoList}>
            <div className={styles.infoRow}>
              <span>Organization Slug</span>
              <strong className={styles.slugBadge}>{org?.slug || '—'}</strong>
            </div>
            <div className={styles.infoRow}>
              <span>Billing Address</span>
              <strong>{org?.billingEmail || 'Not configured'}</strong>
            </div>
            <div className={styles.infoRow}>
              <span>Country</span>
              <strong>{geo.countryCode || '—'}</strong>
            </div>
            {geo.region && (
              <div className={styles.infoRow}>
                <span>State / Region</span>
                <strong>{geo.region}</strong>
              </div>
            )}
            {geo.city && (
              <div className={styles.infoRow}>
                <span>City</span>
                <strong>{geo.city}</strong>
              </div>
            )}
            <div className={styles.infoRow}>
              <span>Currency</span>
              <strong>{geo.currency}</strong>
            </div>
            <div className={styles.infoRow}>
              <span>Timezone</span>
              <strong style={{ fontSize: '0.8rem' }}>{geo.timezone}</strong>
            </div>
          </div>

          <div className={styles.noteBox}>
            <h5>Tenant ID Code</h5>
            <code>ORG-00{org?.id || '00'}-HOURLY</code>
            <p>
              Changing currency updates services and packages immediately. Existing bookings keep the currency they
              were booked in.
            </p>
          </div>
        </div>

        <form className={`surface ${styles.formCard}`} onSubmit={onSubmit}>
          <h4 className={styles.formTitle}>Configure Organization Details</h4>

          <div className="form-group">
            <label className="form-label" htmlFor="orgName">
              Organization name
            </label>
            <input
              id="orgName"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <p className={styles.inputHelper}>Your primary company or brand listing title.</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="billingEmail">
              Billing contact email
            </label>
            <input
              id="billingEmail"
              type="email"
              className="input-field"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
            />
            <p className={styles.inputHelper}>Payment invoices and subscription alerts go here.</p>
          </div>

          <GeoFields value={geo} onChange={setGeo} />

          <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: '8px' }}>
            <i className="fa-solid fa-circle-check" /> {saving ? 'Saving changes…' : 'Save Organization'}
          </button>
        </form>
      </div>
    </div>
  );
}

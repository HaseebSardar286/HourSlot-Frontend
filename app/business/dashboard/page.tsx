'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import { StatCard, MetricGrid } from '@/components/StatCard';
import styles from './dashboard.module.css';

interface Category {
  id: number;
  name: string;
}

interface BusinessProfile {
  id: number;
  name: string;
  description: string;
  logoUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  verified: boolean;
  commissionRate: number;
  rating: number;
  rejectionReason?: string;
  slug?: string;
  registrationNumber?: string;
  galleryUrls?: string;
  primaryCategory?: Category | null;
  secondaryCategories?: Category[];
}

export default function BusinessDashboardPage() {
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [setup, setSetup] = useState({
    branches: 0,
    services: 0,
    staff: 0,
    hours: 0,
  });
  const [docsReady, setDocsReady] = useState(false);
  const [sharing, setSharing] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    logoUrl: string;
    registrationNumber: string;
    primaryCategoryId: string;
    secondaryCategoryIds: number[];
  }>({
    name: '',
    description: '',
    logoUrl: '',
    registrationNumber: '',
    primaryCategoryId: '',
    secondaryCategoryIds: [],
  });

  const loadBusinessProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, categoriesData, branches, services, staff] = await Promise.all([
        apiFetch<BusinessProfile>('/api/business/profile'),
        apiFetch<any[]>('/api/public/categories'),
        apiFetch<{ id: number }[]>('/api/business/branches').catch(() => []),
        apiFetch<{ id: number }[]>('/api/business/services').catch(() => []),
        apiFetch<{ id: number }[]>('/api/business/staff').catch(() => []),
      ]);
      setBusiness(data);

      let hoursCount = 0;
      if (branches.length > 0) {
        const hours = await apiFetch<unknown[]>(
          `/api/business/branches/${branches[0].id}/working-hours`
        ).catch(() => []);
        hoursCount = hours.length;
      }
      setSetup({
        branches: branches.length,
        services: services.length,
        staff: staff.length,
        hours: hoursCount,
      });

      const flat: Category[] = [];
      const traverse = (node: any) => {
        flat.push({ id: node.id, name: node.name });
        if (node.subcategories && node.subcategories.length > 0) {
          node.subcategories.forEach(traverse);
        }
      };
      categoriesData.forEach(traverse);
      setAvailableCategories(flat);

      setFormData({
        name: data.name || '',
        description: data.description || '',
        logoUrl: data.logoUrl || '',
        registrationNumber: data.registrationNumber || '',
        primaryCategoryId: data.primaryCategory ? data.primaryCategory.id.toString() : '',
        secondaryCategoryIds: data.secondaryCategories ? data.secondaryCategories.map((c) => c.id) : [],
      });
    } catch (err: any) {
      setError(err?.message || 'Could not load business profile. Have you registered yet?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinessProfile();
    apiFetch<{ readiness?: { submittedCount?: number; requiredCount?: number } }>(
      '/api/business/verification-documents'
    )
      .then((data) => {
        const submitted = data.readiness?.submittedCount ?? 0;
        const required = data.readiness?.requiredCount ?? 3;
        setDocsReady(submitted >= required);
      })
      .catch(() => setDocsReady(false));
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSecondaryCategoryChange = (categoryId: number) => {
    setFormData((prev) => {
      const current = prev.secondaryCategoryIds;
      const updated = current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId];
      return { ...prev, secondaryCategoryIds: updated };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Business name is required.');
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      await apiFetch('/api/business/profile', {
        method: 'PUT',
        body: JSON.stringify({
          ...formData,
          primaryCategoryId: formData.primaryCategoryId ? parseInt(formData.primaryCategoryId) : null,
          galleryUrls: business?.galleryUrls || '',
        }),
      });
      setMessage('Profile updated successfully!');
      await loadBusinessProfile();
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.dashboardContainer}>
        <Skeleton variant="title" />
        <Skeleton variant="card" count={2} />
        <div className={styles.skeletonGrid}>
          <Skeleton variant="card" count={4} />
        </div>
      </div>
    );
  }

  if (error && !business) {
    return (
      <div className={styles.dashboardContainer}>
        <EmptyState
          icon="fa-briefcase"
          title="No business registered"
          description="Register your business on HourSlot to list branches, staff, and start taking bookings."
          actionLabel="Register Business"
          onAction={() => {
            window.location.href = '/business/register';
          }}
        />
      </div>
    );
  }

  const checklist = [
    { done: !!business?.name && !!business?.description, label: 'Complete business profile', href: '/business/dashboard' },
    { done: setup.branches > 0, label: 'Add a branch', href: '/business/branches' },
    { done: setup.services > 0, label: 'Add a service', href: '/business/services' },
    { done: setup.staff > 0, label: 'Add staff', href: '/business/staff' },
    { done: setup.hours > 0, label: 'Set working hours', href: '/business/availability' },
    { done: docsReady, label: 'Upload verification docs', href: '/business/verification' },
  ];
  const checklistWithDocs = checklist;
  const readyForReview = checklistWithDocs.every((c) => c.done);
  const doneCount = checklistWithDocs.filter((c) => c.done).length;
  const publicPath = `/profile/business/${business?.id}`;
  const publicUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${publicPath}` : publicPath;

  const handleShare = async () => {
    if (!business) return;
    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: business.name,
          text: `Book with ${business.name} on HourSlot`,
          url: publicUrl,
        });
      } else {
        await navigator.clipboard.writeText(publicUrl);
        setMessage('Booking page link copied.');
      }
    } catch {
      // user cancelled share
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      <PageHeader
        title={business?.name || 'Business dashboard'}
        subtitle="Track setup progress, status, and keep your public profile up to date."
        actions={
          business?.status === 'APPROVED' ? (
            <button type="button" className="btn btn-primary" onClick={handleShare} disabled={sharing}>
              <i className="fa-solid fa-share-nodes" /> {sharing ? 'Sharing…' : "You're live — share booking page"}
            </button>
          ) : undefined
        }
      />

      {business?.status === 'PENDING' && (
        <div className={styles.statusAlertPending}>
          <i className="fa-solid fa-clock-rotate-left" />
          <div>
            <strong>Registration pending review</strong>
            <p>
              Super Admin will review your listing. Upload trade license, bank statement, and owner ID under
              Verification to qualify for a verified badge.
            </p>
          </div>
        </div>
      )}

      {business?.status === 'REJECTED' && (
        <div className={styles.statusAlertRejected}>
          <i className="fa-solid fa-circle-xmark" />
          <div>
            <strong>Registration rejected</strong>
            <p>
              Reason: {business.rejectionReason || 'No reason specified'}. Update your details and verification
              documents, then wait for another review.
            </p>
          </div>
        </div>
      )}

      {business?.status === 'SUSPENDED' && (
        <div className={styles.statusAlertSuspended}>
          <i className="fa-solid fa-triangle-exclamation" />
          <div>
            <strong>Account suspended</strong>
            <p>Customers cannot book right now. Contact HourSlot Support.</p>
          </div>
        </div>
      )}

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

      <MetricGrid>
        <StatCard label="Status" value={business?.status?.replace('_', ' ') || '—'} icon="fa-shield-halved" />
        <StatCard
          label="Setup progress"
          value={`${doneCount}/${checklistWithDocs.length}`}
          hint="Checklist items complete"
          icon="fa-list-check"
        />
        <StatCard
          label="Rating"
          value={business?.rating ? business.rating.toFixed(1) : '0.0'}
          icon="fa-star"
        />
        <StatCard
          label="Verified"
          value={business?.verified ? 'Yes' : 'No'}
          hint="Requires approved documents"
          icon="fa-badge-check"
        />
      </MetricGrid>

      <div className={styles.dashboardLayout}>
        <aside className={`surface ${styles.checklistRail}`}>
          <div className={styles.checklistHeader}>
            <div>
              <h3>Setup</h3>
              <p>{doneCount}/{checklistWithDocs.length} complete</p>
            </div>
            <StatusBadge status={business?.status || 'PENDING'} />
          </div>
          <ul className={styles.checklist}>
            {checklistWithDocs.map((item) => (
              <li key={item.label}>
                <span>
                  <i
                    className={`fa-solid ${item.done ? 'fa-circle-check' : 'fa-circle'}`}
                    style={{ color: item.done ? 'var(--accent-green)' : 'var(--text-muted)', marginRight: 8 }}
                  />
                  {item.label}
                </span>
                {!item.done && (
                  <Link href={item.href} className={styles.checklistLink}>
                    Go
                  </Link>
                )}
              </li>
            ))}
          </ul>
          {business?.status === 'APPROVED' ? (
            <button type="button" className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={handleShare}>
              Share booking page
            </button>
          ) : readyForReview ? (
            <p className={styles.railHint}>Setup complete. Waiting for admin approval.</p>
          ) : (
            <p className={styles.railHint}>Finish the remaining steps on the left.</p>
          )}
        </aside>

        <div className={styles.dashboardMain}>
      <div className={styles.dashboardGrid}>
        <div className="surface">
          <div className={styles.profileHeader}>
            <div className={styles.profileLogoContainer}>
              {formData.logoUrl ? (
                <img src={formData.logoUrl} alt="Logo" className={styles.profileLogo} />
              ) : (
                <div className={styles.logoPlaceholder}>
                  <i className="fa-solid fa-briefcase" />
                </div>
              )}
            </div>
            <div className={styles.profileTitleInfo}>
              <h2>{business?.name}</h2>
              <div className={styles.badgeRow}>
                <StatusBadge status={business?.status || 'PENDING'} />
                {business?.verified && (
                  <span className={styles.verifiedBadge}>
                    <i className="fa-solid fa-circle-check" /> Verified Partner
                  </span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className={styles.profileForm}>
            <div className="form-group">
              <label className="form-label" htmlFor="name">
                Business name
              </label>
              <input
                id="name"
                type="text"
                className="input-field"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={business?.status === 'SUSPENDED'}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                className={`input-field ${styles.textarea}`}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                disabled={business?.status === 'SUSPENDED'}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="logoUrl">
                Logo image URL
              </label>
              <input
                id="logoUrl"
                type="text"
                className="input-field"
                value={formData.logoUrl}
                onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                disabled={business?.status === 'SUSPENDED'}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="registrationNumber">
                Government registration / license number
              </label>
              <input
                id="registrationNumber"
                type="text"
                className="input-field"
                value={formData.registrationNumber}
                onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                disabled={business?.status === 'SUSPENDED'}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="primaryCategorySelect">
                Primary category
              </label>
              <select
                id="primaryCategorySelect"
                className="select-field"
                value={formData.primaryCategoryId}
                onChange={(e) => handleInputChange('primaryCategoryId', e.target.value)}
                disabled={business?.status === 'SUSPENDED'}
              >
                <option value="">-- Select Primary Category --</option>
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Secondary Categories</label>
              <div className={styles.categoryGrid}>
                {availableCategories
                  .filter((c) => c.id.toString() !== formData.primaryCategoryId)
                  .map((c) => (
                    <label key={c.id} className={styles.categoryItem}>
                      <input
                        type="checkbox"
                        checked={formData.secondaryCategoryIds.includes(c.id)}
                        onChange={() => handleSecondaryCategoryChange(c.id)}
                        disabled={business?.status === 'SUSPENDED'}
                      />
                      {c.name}
                    </label>
                  ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || business?.status === 'SUSPENDED'}
            >
              {submitting ? 'Saving changes...' : 'Save Profile'}
            </button>
          </form>
        </div>

        <div className={styles.sideColumn}>
          <div className="surface">
            <h3 className={styles.sideTitle}>Listing</h3>
            <div className={styles.metricRow}>
              <span>Average rating</span>
              <strong className={styles.ratingValue}>
                <i className="fa-solid fa-star" /> {business?.rating ? business.rating.toFixed(1) : '0.0'}
              </strong>
            </div>
            <div className={styles.metricRow}>
              <span>Public link</span>
              <span className={styles.slugLink}>{publicPath}</span>
            </div>
          </div>

          <div className={`surface ${styles.tipCard}`}>
            <h4>Verified badge</h4>
            <p>
              Upload your trade license, bank statement, and owner government ID under Verification. Super Admin
              reviews each file before the verified badge is granted.
            </p>
            <Link href="/business/verification" className="btn btn-secondary btn-sm">
              Open verification
            </Link>
          </div>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}

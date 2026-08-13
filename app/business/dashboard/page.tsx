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
    { done: setup.branches > 0, label: 'Add at least one branch', href: '/business/branches' },
    { done: setup.services > 0, label: 'Add a bookable service', href: '/business/services' },
    { done: setup.staff > 0, label: 'Add staff members', href: '/business/staff' },
    { done: setup.hours > 0, label: 'Configure working hours', href: '/business/availability' },
  ];
  const readyForReview = checklist.every((c) => c.done);
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className={styles.dashboardContainer}>
      <PageHeader
        title={business?.name || 'Business Dashboard'}
        subtitle="Track setup progress, status, and keep your public profile up to date."
        actions={
          business?.status === 'APPROVED' ? (
            <Link href={`/profile/business/${business.id}`} className="btn btn-secondary">
              View public page
            </Link>
          ) : undefined
        }
      />

      {business?.status === 'PENDING' && (
        <div className={styles.statusAlertPending}>
          <i className="fa-solid fa-clock-rotate-left" />
          <div>
            <strong>Registration pending review</strong>
            <p>Administrators are verifying your application. Some scheduling features unlock after approval.</p>
          </div>
        </div>
      )}

      {business?.status === 'REJECTED' && (
        <div className={styles.statusAlertRejected}>
          <i className="fa-solid fa-circle-xmark" />
          <div>
            <strong>Registration rejected</strong>
            <p>
              Reason: {business.rejectionReason || 'No reason specified'}. Update your details and resubmit for
              approval.
            </p>
          </div>
        </div>
      )}

      {business?.status === 'SUSPENDED' && (
        <div className={styles.statusAlertSuspended}>
          <i className="fa-solid fa-triangle-exclamation" />
          <div>
            <strong>Account suspended</strong>
            <p>Customers cannot book right now. Please contact HourSlot Support.</p>
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
        <StatCard label="Setup progress" value={`${doneCount}/${checklist.length}`} hint="Checklist items complete" icon="fa-list-check" />
        <StatCard
          label="Rating"
          value={business?.rating ? business.rating.toFixed(1) : '0.0'}
          icon="fa-star"
        />
        <StatCard label="Commission" value={`${business?.commissionRate ?? 0}%`} icon="fa-percent" />
      </MetricGrid>

      <div className={`surface ${styles.checklistCard}`}>
        <div className={styles.checklistHeader}>
          <div>
            <h3>Setup checklist</h3>
            <p>Finish these steps so customers can book once your business is approved.</p>
          </div>
          <StatusBadge status={business?.status || 'PENDING'} />
        </div>
        <ul className={styles.checklist}>
          {checklist.map((item) => (
            <li key={item.label}>
              <span>
                <i
                  className={`fa-solid ${item.done ? 'fa-circle-check' : 'fa-circle'}`}
                  style={{ color: item.done ? 'var(--accent-green)' : 'var(--text-muted)', marginRight: 8 }}
                />
                {item.label}
              </span>
              {!item.done && (
                <Link href={item.href} className="btn btn-secondary btn-sm">
                  Continue
                </Link>
              )}
            </li>
          ))}
        </ul>
        {business?.status === 'APPROVED' ? (
          <div className="success-alert">
            You&apos;re live — share your booking page:{' '}
            <Link href={`/profile/business/${business.id}`}>/profile/business/{business.id}</Link>
          </div>
        ) : readyForReview ? (
          <div className="success-alert">Setup complete. Waiting for admin approval before customers can book.</div>
        ) : (
          <div className={`error-alert ${styles.warnAlert}`}>Complete the checklist before going live.</div>
        )}
      </div>

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
                Business Name
              </label>
              <input
                id="name"
                type="text"
                className="input-field"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g. Apex Health Clinic"
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
                placeholder="Briefly describe your services..."
                disabled={business?.status === 'SUSPENDED'}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="logoUrl">
                Logo Image URL
              </label>
              <input
                id="logoUrl"
                type="text"
                className="input-field"
                value={formData.logoUrl}
                onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                placeholder="https://example.com/logo.png"
                disabled={business?.status === 'SUSPENDED'}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="registrationNumber">
                Government Reg / License Number
              </label>
              <input
                id="registrationNumber"
                type="text"
                className="input-field"
                value={formData.registrationNumber}
                onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                placeholder="e.g. REG-776483-ABC"
                disabled={business?.status === 'SUSPENDED'}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="primaryCategorySelect">
                Primary Category
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
            <h3 className={styles.sideTitle}>Business metrics</h3>
            <div className={styles.metricRow}>
              <span>Platform commission</span>
              <strong>{business?.commissionRate}%</strong>
            </div>
            <div className={styles.metricRow}>
              <span>Average rating</span>
              <strong className={styles.ratingValue}>
                <i className="fa-solid fa-star" /> {business?.rating ? business.rating.toFixed(1) : '0.0'}
              </strong>
            </div>
            <div className={styles.metricRow}>
              <span>Public link</span>
              <span className={styles.slugLink}>{business?.slug ? `/b/${business.slug}` : 'No slug yet'}</span>
            </div>
          </div>

          <div className={`surface ${styles.tipCard}`}>
            <h4>Verification badges</h4>
            <p>
              Add your official registration number to apply for the verified checkmark. Verified businesses get higher
              visibility in local search.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

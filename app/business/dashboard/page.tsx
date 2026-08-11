'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
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
  const { user } = useAuth();
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

  // Form states
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
        secondaryCategoryIds: data.secondaryCategories ? data.secondaryCategories.map(c => c.id) : [],
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
        ? current.filter(id => id !== categoryId)
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
          galleryUrls: business?.galleryUrls || '', // Preserve gallery URLs
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
      <div className={styles.loaderContainer}>
        <div className="spinner" />
      </div>
    );
  }

  if (error && !business) {
    return (
      <div className={styles.errorState}>
        <div className="glass-card text-center" style={{ padding: '40px', maxWidth: '500px', margin: '40px auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>💼</div>
          <h3>No Business Registered</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            It looks like you haven't registered your business on HourSlot yet. Register now to list branches, staff, and start taking bookings.
          </p>
          <a href="/business/register" className="btn btn-primary">
            Register Business
          </a>
        </div>
      </div>
    );
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'APPROVED': return styles.badgeApproved;
      case 'REJECTED': return styles.badgeRejected;
      case 'SUSPENDED': return styles.badgeSuspended;
      default: return styles.badgePending;
    }
  };

  const checklist = [
    { done: !!business?.name && !!business?.description, label: 'Complete business profile', href: '/business/dashboard' },
    { done: setup.branches > 0, label: 'Add at least one branch', href: '/business/branches' },
    { done: setup.services > 0, label: 'Add a bookable service', href: '/business/services' },
    { done: setup.staff > 0, label: 'Add staff members', href: '/business/staff' },
    { done: setup.hours > 0, label: 'Configure working hours', href: '/business/availability' },
  ];
  const readyForReview = checklist.every((c) => c.done);

  return (
    <div className={styles.dashboardContainer}>
      <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Setup checklist</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>
          Finish these steps so customers can book once your business is approved.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0', display: 'grid', gap: 10 }}>
          {checklist.map((item) => (
            <li key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span>
                <i
                  className={`fa-solid ${item.done ? 'fa-circle-check' : 'fa-circle'}`}
                  style={{ color: item.done ? 'var(--accent-green)' : 'var(--text-muted)', marginRight: 8 }}
                />
                {item.label}
              </span>
              {!item.done && (
                <Link href={item.href} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  Continue
                </Link>
              )}
            </li>
          ))}
        </ul>
        {business?.status === 'APPROVED' ? (
          <div className="success-alert" style={{ marginTop: 16 }}>
            You&apos;re live — share your booking page: <Link href={`/profile/business/${business.id}`}>/profile/business/{business.id}</Link>
          </div>
        ) : readyForReview ? (
          <div className="success-alert" style={{ marginTop: 16 }}>
            Setup complete. Waiting for admin approval before customers can book.
          </div>
        ) : (
          <div className="error-alert" style={{ marginTop: 16, background: 'rgba(245,158,11,0.08)', color: '#b45309' }}>
            Complete the checklist before going live.
          </div>
        )}
      </div>

      {/* Top Banner Alert depending on verification status */}
      {business?.status === 'PENDING' && (
        <div className={styles.statusAlertPending}>
          <i className="fa-solid fa-clock-rotate-left"></i>
          <div>
            <strong>Registration Pending Review</strong>
            <p>Our administrators are currently verifying your business application. Some branch and scheduling configurations will unlock after approval.</p>
          </div>
        </div>
      )}

      {business?.status === 'REJECTED' && (
        <div className={styles.statusAlertRejected}>
          <i className="fa-solid fa-circle-xmark"></i>
          <div>
            <strong>Registration Rejected</strong>
            <p>Reason: {business.rejectionReason || 'No reason specified'}. You can update your business details and re-submit for approval.</p>
          </div>
        </div>
      )}

      {business?.status === 'SUSPENDED' && (
        <div className={styles.statusAlertSuspended}>
          <i className="fa-solid fa-triangle-exclamation"></i>
          <div>
            <strong>Account Suspended</strong>
            <p>Your business page is suspended. Customers cannot book services at this time. Please contact HourSlot Support.</p>
          </div>
        </div>
      )}

      {message && <div className="success-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-circle-check"></i> {message}</div>}
      {error && <div className="error-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-triangle-exclamation"></i> {error}</div>}

      <div className={styles.dashboardGrid}>
        {/* Profile Card & Details */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div className={styles.profileHeader}>
            <div className={styles.profileLogoContainer}>
              {formData.logoUrl ? (
                <img src={formData.logoUrl} alt="Logo" className={styles.profileLogo} />
              ) : (
                <div className={styles.logoPlaceholder}>💼</div>
              )}
            </div>
            <div className={styles.profileTitleInfo}>
              <h2>{business?.name}</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                <span className={`${styles.statusBadge} ${getStatusBadgeClass(business?.status || 'PENDING')}`}>
                  {business?.status}
                </span>
                {business?.verified && (
                  <span className={styles.verifiedBadge}>
                    <i className="fa-solid fa-circle-check"></i> Verified Partner
                  </span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className={styles.profileForm}>
            <div className="form-group">
              <label className="form-label" htmlFor="name">Business Name</label>
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
              <label className="form-label" htmlFor="description">Description</label>
              <textarea
                id="description"
                className="input-field"
                style={{ minHeight: '100px', resize: 'vertical' }}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Briefly describe your services..."
                disabled={business?.status === 'SUSPENDED'}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="logoUrl">Logo Image URL</label>
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
              <label className="form-label" htmlFor="registrationNumber">Government Reg / License Number</label>
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
              <label className="form-label" htmlFor="primaryCategorySelect">Primary Category</label>
              <select
                id="primaryCategorySelect"
                className="input-field"
                value={formData.primaryCategoryId}
                onChange={(e) => handleInputChange('primaryCategoryId', e.target.value)}
                disabled={business?.status === 'SUSPENDED'}
              >
                <option value="">-- Select Primary Category --</option>
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Secondary Categories</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', marginTop: '6px', background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                {availableCategories
                  .filter((c) => c.id.toString() !== formData.primaryCategoryId)
                  .map((c) => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#ffffff' }}>
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
              style={{ width: '100%', marginTop: '10px' }}
              disabled={submitting || business?.status === 'SUSPENDED'}
            >
              {submitting ? 'Saving changes...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Stats and Info Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Metrics */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Business Metrics</h3>
            <div className={styles.metricRow}>
              <span>Platform Commission</span>
              <strong>{business?.commissionRate}%</strong>
            </div>
            <div className={styles.metricRow}>
              <span>Average Rating</span>
              <strong style={{ color: '#f59e0b' }}>
                ⭐ {business?.rating ? business.rating.toFixed(1) : '0.0'}
              </strong>
            </div>
            <div className={styles.metricRow}>
              <span>Public Link Preview</span>
              <span className={styles.slugLink}>
                {business?.slug ? `/b/${business.slug}` : 'No slug configured'}
              </span>
            </div>
          </div>

          {/* Guidelines info box */}
          <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid var(--accent-primary)' }}>
            <h4 style={{ marginBottom: '8px', color: '#ffffff' }}>Verification Badges</h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Add your official government registration number to apply for the verified green checkmark. Verified businesses receive higher visibility in local coordinate search matches.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

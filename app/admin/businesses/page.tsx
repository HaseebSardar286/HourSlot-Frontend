'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import FilterBar from '@/components/FilterBar';
import Tabs from '@/components/Tabs';
import StatusBadge from '@/components/StatusBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import styles from './businesses.module.css';

interface Business {
  id: number;
  name: string;
  description?: string;
  category?: string;
  status: string;
  verified: boolean;
  commissionRate: number;
  rating: number;
  logoUrl?: string;
  rejectionReason?: string;
  createdAt: string;
  owner: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<Business | null>(null);
  const [verifying, setVerifying] = useState(false);

  const loadBusinesses = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/admin/businesses?status=${encodeURIComponent(statusFilter)}&search=${encodeURIComponent(searchQuery)}`;
      const data = await apiFetch<Business[]>(url);
      setBusinesses(data);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve business listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadBusinesses();
  };

  const handleQuickVerify = async () => {
    if (!verifyTarget) return;
    setVerifying(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/businesses/${verifyTarget.id}/verify`, { method: 'PUT' });
      setMessage(`Business "${verifyTarget.name}" verified and approved successfully.`);
      if (statusFilter === 'PENDING') {
        setBusinesses((prev) => prev.filter((b) => b.id !== verifyTarget.id));
      } else {
        setBusinesses((prev) =>
          prev.map((b) => (b.id === verifyTarget.id ? { ...b, verified: true, status: 'APPROVED' } : b))
        );
      }
      setVerifyTarget(null);
    } catch (err: any) {
      setError(err.message || 'Failed to verify business.');
    } finally {
      setVerifying(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={styles.businessesWrapper}>
      <PageHeader title="Businesses" subtitle="Review applications, verify partners, and open detail records." />

      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="success-alert">
          <i className="fa-solid fa-circle-check" />
          <span>{message}</span>
        </div>
      )}

      <Tabs
        tabs={[
          { id: '', label: 'All' },
          { id: 'PENDING', label: 'Pending' },
          { id: 'APPROVED', label: 'Approved' },
          { id: 'REJECTED', label: 'Rejected' },
          { id: 'SUSPENDED', label: 'Suspended' },
        ]}
        active={statusFilter}
        onChange={setStatusFilter}
      />

      <form onSubmit={handleSearchSubmit}>
        <FilterBar>
          <input
            type="text"
            className="input-field"
            placeholder="Search business, category, owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
        </FilterBar>
      </form>

      {loading && businesses.length === 0 ? (
        <Skeleton variant="card" count={3} />
      ) : businesses.length === 0 ? (
        <EmptyState icon="fa-store" title="No businesses found" description="No business applications match this filter." />
      ) : (
        <div className={styles.businessGrid}>
          {businesses.map((b) => (
            <div key={b.id} className={`surface ${styles.businessCard}`}>
              <div className={styles.cardTop}>
                {b.logoUrl ? (
                  <img src={b.logoUrl} alt={b.name} className={styles.bizLogo} />
                ) : (
                  <div className={styles.bizInitials}>{b.name.charAt(0)}</div>
                )}
                <div className={styles.bizMeta}>
                  <h3 className={styles.bizName}>{b.name}</h3>
                  <span className={styles.bizCategory}>{b.category || 'Service provider'}</span>
                </div>
                <StatusBadge status={b.status} />
              </div>

              <p className={styles.bizDesc}>{b.description || 'No description provided.'}</p>
              <div className={styles.detailRow}>
                <span>
                  Owner: {b.owner?.firstName} {b.owner?.lastName}
                </span>
                <span>{b.owner?.email}</span>
                <span>Registered: {formatDate(b.createdAt)}</span>
                <span>Commission: {b.commissionRate}%</span>
              </div>

              <div className={styles.cardFooter}>
                {b.status === 'PENDING' && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setVerifyTarget(b)}>
                    Approve
                  </button>
                )}
                <Link href={`/admin/businesses/${b.id}`} className="btn btn-outline btn-sm">
                  Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!verifyTarget}
        title="Approve business"
        message={`Verify and approve "${verifyTarget?.name}"?`}
        confirmLabel="Approve"
        loading={verifying}
        onConfirm={handleQuickVerify}
        onCancel={() => setVerifyTarget(null)}
      />
    </div>
  );
}

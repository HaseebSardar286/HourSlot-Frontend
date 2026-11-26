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
import DataTable from '@/components/DataTable';
import { useRouter } from 'next/navigation';
import styles from './businesses.module.css';

interface Business {
  id: number;
  name: string;
  description?: string;
  category?: string;
  status: string;
  verified: boolean;
  publishStatus?: string;
  listingMode?: string;
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
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBusinesses = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/admin/businesses?status=${encodeURIComponent(statusFilter)}&search=${encodeURIComponent(searchQuery)}`;
      const data = await apiFetch<Business[]>(url);
      setBusinesses(data);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to retrieve business listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data when the page opens
    loadBusinesses();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadBusinesses();
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
      <PageHeader
        title="Businesses"
        subtitle="Review applications, approve listings, and grant Verified badges from each listing’s detail page."
      />

      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" />
          <span>{error}</span>
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
        <DataTable<Business>
          rows={businesses}
          rowKey={(b) => b.id}
          onRowClick={(b) => router.push(`/admin/businesses/${b.id}`)}
          defaultSort={{ key: 'created', dir: 'desc' }}
          columns={[
            {
              key: 'name', header: 'Business', sortValue: (b) => b.name,
              render: (b) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  {b.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- uploaded logo
                    <img src={b.logoUrl} alt="" className={styles.bizLogo} style={{ width: 28, height: 28 }} />
                  ) : (
                    <div className={styles.bizInitials} style={{ width: 28, height: 28, fontSize: '0.75rem' }}>{b.name.charAt(0)}</div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <strong>{b.name}{b.verified ? <i className="fa-solid fa-circle-check" style={{ color: '#2563eb', marginLeft: 6, fontSize: '0.75rem' }} title="Verified" /> : null}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {b.listingMode === 'INDIVIDUAL' ? 'Individual' : b.category || 'Service provider'}
                    </span>
                  </div>
                </div>
              ),
            },
            {
              key: 'owner', header: 'Owner', sortValue: (b) => `${b.owner?.firstName || ''} ${b.owner?.lastName || ''}`,
              render: (b) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>{`${b.owner?.firstName || ''} ${b.owner?.lastName || ''}`.trim() || '—'}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.owner?.email}</span>
                </div>
              ),
            },
            { key: 'status', header: 'Status', sortValue: (b) => b.status, render: (b) => <StatusBadge status={b.status} /> },
            { key: 'publish', header: 'Listing', hideOnMobile: true, sortValue: (b) => b.publishStatus || 'DRAFT', render: (b) => <StatusBadge status={b.publishStatus || 'DRAFT'} /> },
            { key: 'rating', header: 'Rating', align: 'right', hideOnMobile: true, sortValue: (b) => b.rating || 0, render: (b) => (b.rating ? b.rating.toFixed(1) : '—') },
            { key: 'created', header: 'Registered', align: 'right', sortValue: (b) => new Date(b.createdAt).getTime(), render: (b) => formatDate(b.createdAt) },
            {
              key: 'go', header: '', align: 'right',
              render: (b) => (
                <Link href={`/admin/businesses/${b.id}`} className={`btn btn-sm ${b.status === 'PENDING' ? 'btn-primary' : 'btn-outline'}`} onClick={(e) => e.stopPropagation()}>
                  {b.status === 'PENDING' ? 'Review' : 'Open'}
                </Link>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import type { CustomerPackage } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';
import Skeleton from '@/components/Skeleton';
import styles from './packages.module.css';

export default function CustomerPackagesPage() {
  const [packages, setPackages] = useState<CustomerPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPackages = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<CustomerPackage[]>('/api/customer/packages');
      setPackages(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load purchased packages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <div className={styles.container}>
      <PageHeader
        title="Package wallet"
        subtitle="Session bundles you’ve purchased — redeem them when booking."
        actions={
          <Link href="/profile/explore" className="btn btn-primary btn-sm">
            Browse businesses
          </Link>
        }
      />

      {error && (
        <div className="error-alert" style={{ marginBottom: 16 }}>
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      {loading ? (
        <div className={styles.grid}>
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} variant="card" height={180} />
          ))}
        </div>
      ) : packages.length === 0 ? (
        <EmptyState
          icon="fa-gift"
          title="No packages yet"
          description="Purchase session bundles from a business profile to save on bulk bookings."
          actionLabel="Explore local services"
          onAction={() => {
            window.location.href = '/profile/explore';
          }}
        />
      ) : (
        <div className={styles.grid}>
          {packages.map((cp) => (
            <div key={cp.id} className={`surface ${styles.card}`}>
              <div className={styles.cardTop}>
                <span className={styles.bizName}>{cp.servicePackage.business?.name || 'Business'}</span>
                <StatusBadge status={cp.status} />
              </div>
              <h3 className={styles.pkgName}>{cp.servicePackage.name}</h3>
              <div className={styles.sessions}>
                {cp.sessionsRemaining}{' '}
                <span>
                  sessions left (of {cp.servicePackage.sessionsCount})
                </span>
              </div>
              <div className={styles.meta}>
                <span>Purchased {formatDate(cp.createdAt)}</span>
                {cp.expiresAt && <span>Expires {formatDate(cp.expiresAt)}</span>}
              </div>
              {cp.servicePackage.business?.id && cp.status === 'ACTIVE' && cp.sessionsRemaining > 0 && (
                <Link
                  href={`/profile/book/${cp.servicePackage.business.id}`}
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: 14, alignSelf: 'flex-start' }}
                >
                  Book with package
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

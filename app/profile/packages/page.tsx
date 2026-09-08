'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { buildBookingHref } from '@/lib/booking-flow';
import type { CustomerPackage } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';
import Skeleton from '@/components/Skeleton';
import styles from './packages.module.css';

function CustomerPackagesContent() {
  const searchParams = useSearchParams();
  const [packages, setPackages] = useState<CustomerPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadPackages = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<CustomerPackage[]>('/api/customer/packages');
      setPackages(data || []);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to load purchased packages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      setSuccess('Package payment completed successfully.');
      setError(null);
    }
    if (payment === 'cancelled') {
      setError('Online package payment was cancelled.');
      setSuccess(null);
    }
  }, [searchParams]);

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

      {success && (
        <div className="success-alert" style={{ marginBottom: 16 }}>
          <i className="fa-solid fa-circle-check" /> {success}
        </div>
      )}
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
                  href={buildBookingHref(cp.servicePackage.business.id, {
                    step: 'service',
                    customerPackageId: String(cp.id),
                  })}
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

export default function CustomerPackagesPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.container}>
          <PageHeader title="Package wallet" subtitle="Loading your packages…" />
          <div className={styles.grid}>
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} variant="card" height={180} />
            ))}
          </div>
        </div>
      }
    >
      <CustomerPackagesContent />
    </Suspense>
  );
}

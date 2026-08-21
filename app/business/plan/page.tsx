'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useOwnerPlan } from '@/lib/owner-plan-context';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';
import styles from './plan.module.css';

type PlanRow = {
  code: string;
  name: string;
  price: number;
  currency: string;
  billingInterval: string;
  current?: boolean;
  entitlements: Record<string, unknown>;
  features?: { copy?: string };
};

type PlansPayload = {
  current: { planCode: string; planName: string; usage: Record<string, number> };
  plans: PlanRow[];
  billingNote: string;
};

const FEATURE_ROWS: { key: string; label: string; kind: 'bool' | 'int' }[] = [
  { key: 'max_branches', label: 'Branches', kind: 'int' },
  { key: 'max_staff', label: 'Staff seats', kind: 'int' },
  { key: 'peak_pricing', label: 'Peak pricing', kind: 'bool' },
  { key: 'packages', label: 'Session packages', kind: 'bool' },
  { key: 'waitlist', label: 'Waitlist', kind: 'bool' },
  { key: 'last_minute_deals', label: 'Last-minute deals', kind: 'bool' },
  { key: 'sms_monthly', label: 'SMS / month', kind: 'int' },
  { key: 'yield_dashboard', label: 'Yield dashboard', kind: 'bool' },
  { key: 'white_label', label: 'White-label booking page', kind: 'bool' },
  { key: 'owner_reply', label: 'Review owner replies', kind: 'bool' },
];

function formatValue(kind: 'bool' | 'int', value: unknown) {
  if (kind === 'bool') return value ? 'Yes' : '—';
  const n = Number(value ?? 0);
  if (n >= 999) return 'Unlimited';
  return String(n);
}

export default function PlanPage() {
  const { refresh } = useOwnerPlan();
  const [payload, setPayload] = useState<PlansPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<PlansPayload>('/api/business/plans')
      .then((data) => {
        setPayload(data);
        void refresh();
      })
      .catch((err: { message?: string }) => setError(err?.message || 'Could not load plans.'))
      .finally(() => setLoading(false));
  }, [refresh]);

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="title" />
        <Skeleton variant="card" count={3} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Subscription plans"
        subtitle={`You are on ${payload?.current?.planName || 'Starter'}. Compare plan effectiveness below.`}
      />
      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}
      {payload?.billingNote && <p className={styles.note}>{payload.billingNote}</p>}

      {payload?.current?.usage && (
        <div className={`surface ${styles.usage}`}>
          <strong>Current usage</strong>
          <span>Branches: {payload.current.usage.branches ?? 0}</span>
          <span>Staff: {payload.current.usage.staff ?? 0}</span>
          <span>Businesses: {payload.current.usage.businesses ?? 0}</span>
        </div>
      )}

      <div className={styles.cards}>
        {(payload?.plans || []).map((plan) => (
          <article key={plan.code} className={`surface ${styles.card} ${plan.current ? styles.current : ''}`}>
            <header>
              <h3>{plan.name}</h3>
              {plan.current && <span className={styles.badge}>Current</span>}
            </header>
            <div className={styles.price}>
              {Number(plan.price) === 0 ? (
                <strong>Free</strong>
              ) : (
                <>
                  <strong>
                    {plan.currency} {Number(plan.price).toFixed(0)}
                  </strong>
                  <span>/{(plan.billingInterval || 'MONTH').toLowerCase()}</span>
                </>
              )}
            </div>
            {plan.features?.copy && <p className={styles.copy}>{plan.features.copy}</p>}
            <ul>
              {FEATURE_ROWS.map((row) => (
                <li key={row.key}>
                  <span>{row.label}</span>
                  <strong>{formatValue(row.kind, plan.entitlements?.[row.key])}</strong>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}

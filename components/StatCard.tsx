'use client';

import { ReactNode } from 'react';
import styles from './ui.module.css';

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: string;
}

export function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <div className={styles.statCard}>
      {icon && (
        <div className={styles.statIcon}>
          <i className={`fa-solid ${icon}`} aria-hidden />
        </div>
      )}
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      {hint && <div className={styles.statHint}>{hint}</div>}
    </div>
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return <div className={styles.metricGrid}>{children}</div>;
}

'use client';

import styles from './ui.module.css';

const COLORS: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: 'rgba(245, 158, 11, 0.12)', color: '#b45309' },
  CONFIRMED: { bg: 'rgba(26, 138, 138, 0.12)', color: '#0f766e' },
  IN_PROGRESS: { bg: 'rgba(59, 130, 246, 0.12)', color: '#1d4ed8' },
  COMPLETED: { bg: 'rgba(16, 185, 129, 0.12)', color: '#047857' },
  CANCELLED: { bg: 'rgba(239, 68, 68, 0.12)', color: '#b91c1c' },
  NO_SHOW: { bg: 'rgba(100, 116, 139, 0.12)', color: '#475569' },
  RESCHEDULED: { bg: 'rgba(91, 184, 140, 0.15)', color: '#0f766e' },
  APPROVED: { bg: 'rgba(16, 185, 129, 0.12)', color: '#047857' },
  REJECTED: { bg: 'rgba(239, 68, 68, 0.12)', color: '#b91c1c' },
  SUSPENDED: { bg: 'rgba(239, 68, 68, 0.12)', color: '#b91c1c' },
  ACTIVE: { bg: 'rgba(16, 185, 129, 0.12)', color: '#047857' },
  EXHAUSTED: { bg: 'rgba(100, 116, 139, 0.12)', color: '#475569' },
  EXPIRED: { bg: 'rgba(239, 68, 68, 0.12)', color: '#b91c1c' },
  PAID: { bg: 'rgba(16, 185, 129, 0.12)', color: '#047857' },
  UNPAID: { bg: 'rgba(245, 158, 11, 0.12)', color: '#b45309' },
};

export default function StatusBadge({ status }: { status: string }) {
  const key = status?.toUpperCase().replace(/\s+/g, '_') || '';
  const normalized = key.startsWith('PAID') ? 'PAID' : key;
  const style = COLORS[normalized] || { bg: 'rgba(26, 138, 138, 0.08)', color: 'var(--text-secondary)' };
  return (
    <span className={styles.statusBadge} style={{ background: style.bg, color: style.color }}>
      {status.replaceAll('_', ' ').toLowerCase()}
    </span>
  );
}

'use client';

const COLORS: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: 'rgba(245, 158, 11, 0.12)', color: '#b45309' },
  CONFIRMED: { bg: 'rgba(26, 138, 138, 0.12)', color: '#0f766e' },
  IN_PROGRESS: { bg: 'rgba(59, 130, 246, 0.12)', color: '#1d4ed8' },
  COMPLETED: { bg: 'rgba(16, 185, 129, 0.12)', color: '#047857' },
  CANCELLED: { bg: 'rgba(239, 68, 68, 0.12)', color: '#b91c1c' },
  NO_SHOW: { bg: 'rgba(100, 116, 139, 0.12)', color: '#475569' },
  APPROVED: { bg: 'rgba(16, 185, 129, 0.12)', color: '#047857' },
  REJECTED: { bg: 'rgba(239, 68, 68, 0.12)', color: '#b91c1c' },
  SUSPENDED: { bg: 'rgba(239, 68, 68, 0.12)', color: '#b91c1c' },
};

export default function StatusBadge({ status }: { status: string }) {
  const style = COLORS[status] || { bg: 'rgba(26, 138, 138, 0.08)', color: 'var(--text-secondary)' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.02em',
        background: style.bg,
        color: style.color,
        textTransform: 'capitalize',
      }}
    >
      {status.replaceAll('_', ' ').toLowerCase()}
    </span>
  );
}

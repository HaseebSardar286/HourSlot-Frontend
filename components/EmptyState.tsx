'use client';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon = 'fa-inbox',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="glass-card text-center" style={{ padding: '48px 32px' }}>
      <i
        className={`fa-solid ${icon}`}
        style={{ fontSize: '2.2rem', color: 'var(--accent-primary)', marginBottom: 12 }}
        aria-hidden
      />
      <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem' }}>{title}</h3>
      {description && (
        <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px' }}>{description}</p>
      )}
      {actionLabel && onAction && (
        <button type="button" className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

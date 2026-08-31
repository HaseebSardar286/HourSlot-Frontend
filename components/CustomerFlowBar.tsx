'use client';

import Link from 'next/link';
import styles from './customer-flow-bar.module.css';

export type FlowStep = 'explore' | 'business' | 'book' | 'confirm';

interface CustomerFlowBarProps {
  businessName?: string;
  businessId?: string | number;
  current?: FlowStep;
}

const STEPS: { id: FlowStep; label: string; href: (props: CustomerFlowBarProps) => string | null }[] = [
  { id: 'explore', label: 'Explore', href: () => '/profile/explore' },
  {
    id: 'business',
    label: 'Business',
    href: (p) => (p.businessId ? `/profile/business/${p.businessId}` : null),
  },
  {
    id: 'book',
    label: 'Book',
    href: (p) => (p.businessId ? `/profile/book/${p.businessId}?step=service` : null),
  },
  {
    id: 'confirm',
    label: 'Confirm',
    href: (p) => (p.businessId ? `/profile/book/${p.businessId}?step=confirm` : null),
  },
];

export default function CustomerFlowBar({ businessName, businessId, current = 'explore' }: CustomerFlowBarProps) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);

  return (
    <nav className={styles.bar} aria-label="Booking progress">
      <ol className={styles.list}>
        {STEPS.map((step, idx) => {
          const href = step.href({ businessName, businessId, current });
          const isPast = idx < currentIdx;
          const isCurrent = step.id === current;
          const label =
            step.id === 'business' && businessName ? businessName : step.label;

          return (
            <li key={step.id} className={styles.item}>
              {idx > 0 && <span className={styles.sep} aria-hidden />}
              {href && (isPast || !isCurrent) ? (
                <Link
                  href={href}
                  className={`${styles.link} ${isCurrent ? styles.current : ''} ${isPast ? styles.done : ''}`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isPast && <i className="fa-solid fa-check" aria-hidden />}
                  <span>{label}</span>
                </Link>
              ) : (
                <span
                  className={`${styles.link} ${isCurrent ? styles.current : ''} ${!href ? styles.muted : ''}`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span>{label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

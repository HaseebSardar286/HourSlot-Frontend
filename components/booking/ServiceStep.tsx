'use client';

import type { Service } from '@/lib/types';
import { formatMoney } from '@/lib/money';
import EmptyState from '@/components/EmptyState';
import styles from './booking.module.css';

interface ServiceStepProps {
  services: Service[];
  selectedServiceId: string;
  currency?: string;
  onSelect: (serviceId: string) => void;
}

function serviceIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('consult')) return 'fa-comments';
  if (n.includes('color') || n.includes('dye')) return 'fa-palette';
  if (n.includes('cut') || n.includes('hair')) return 'fa-scissors';
  if (n.includes('massage') || n.includes('spa') || n.includes('facial')) return 'fa-spa';
  if (n.includes('train') || n.includes('fitness') || n.includes('yoga')) return 'fa-dumbbell';
  return 'fa-calendar-check';
}

export default function ServiceStep({ services, selectedServiceId, currency, onSelect }: ServiceStepProps) {
  const money = (amount: number, code?: string) => formatMoney(amount, code || currency);

  if (services.length === 0) {
    return (
      <EmptyState icon="fa-scissors" title="No services available" description="This business has not published services yet." />
    );
  }

  return (
    <div className={styles.serviceGrid}>
      {services.map((s) => {
        const on = selectedServiceId === String(s.id);
        return (
          <button
            key={s.id}
            type="button"
            className={`${styles.serviceCard} ${on ? styles.serviceCardOn : ''}`}
            onClick={() => onSelect(String(s.id))}
          >
            <span className={styles.serviceCardIcon}>
              <i className={`fa-solid ${serviceIcon(s.name)}`} />
            </span>
            <div className={styles.serviceInfo}>
              <strong>{s.name}</strong>
              <p>{s.description || `${s.durationMinutes}-minute appointment`}</p>
              <span className={styles.serviceMeta}>
                <i className="fa-regular fa-clock" /> {s.durationMinutes} min
              </span>
            </div>
            <div className={styles.servicePrice}>
              <strong>{money(s.price, s.currency)}</strong>
            </div>
            {on && <span className={styles.serviceSelectedMark}><i className="fa-solid fa-check" /></span>}
          </button>
        );
      })}
    </div>
  );
}

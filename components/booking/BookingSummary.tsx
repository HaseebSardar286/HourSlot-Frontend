'use client';

import type { Branch, Service, Staff } from '@/lib/types';
import { formatFriendlyDate, formatFriendlyTime } from '@/lib/booking-flow';
import { formatMoney } from '@/lib/money';
import styles from './booking.module.css';

interface BookingSummaryProps {
  businessName: string;
  businessThumb?: string | null;
  service?: Service | null;
  branch?: Branch | null;
  staff?: Staff | null;
  date?: string;
  slot?: string;
  price?: number;
  currency?: string;
}

export default function BookingSummary({
  businessName,
  businessThumb,
  service,
  branch,
  staff,
  date,
  slot,
  price,
  currency,
}: BookingSummaryProps) {
  const money = (amount: number) => formatMoney(amount, currency || service?.currency);

  return (
    <div className={styles.summary}>
      <div className={styles.summaryHeader}>
        <i className="fa-solid fa-receipt" />
        <h3>Booking summary</h3>
      </div>

      <div className={styles.summaryHero}>
        <div className={styles.summaryHeroThumb}>
          {businessThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={businessThumb} alt="" />
          ) : (
            businessName.charAt(0)
          )}
        </div>
        <div>
          <strong>{businessName}</strong>
          <span>{service?.name || 'Select a service to begin'}</span>
        </div>
      </div>

      {service ? (
        <div className={styles.summaryRows}>
          {branch && (
            <div className={styles.summaryRow}>
              <span className={styles.summaryRowLabel}>
                <i className="fa-solid fa-location-dot" /> Location
              </span>
              <strong>{branch.name}</strong>
            </div>
          )}
          <div className={styles.summaryRow}>
            <span className={styles.summaryRowLabel}>
              <i className="fa-regular fa-clock" /> Duration
            </span>
            <strong>{service.durationMinutes} min</strong>
          </div>
          {staff && (
            <div className={styles.summaryRow}>
              <span className={styles.summaryRowLabel}>
                <i className="fa-solid fa-user" /> Specialist
              </span>
              <strong>{staff.name}</strong>
            </div>
          )}
          {date && (
            <div className={styles.summaryRow}>
              <span className={styles.summaryRowLabel}>
                <i className="fa-regular fa-calendar" /> Date
              </span>
              <strong>{formatFriendlyDate(date)}</strong>
            </div>
          )}
          {slot && (
            <div className={styles.summaryRow}>
              <span className={styles.summaryRowLabel}>
                <i className="fa-regular fa-clock" /> Time
              </span>
              <strong>{formatFriendlyTime(slot)}</strong>
            </div>
          )}
        </div>
      ) : (
        <p className={styles.summaryEmpty}>Your selections will appear here as you move through each step.</p>
      )}

      {service && (
        <div className={styles.summaryTotal}>
          <span>Estimated total</span>
          <strong>{price != null ? money(price) : money(service.price)}</strong>
        </div>
      )}
    </div>
  );
}

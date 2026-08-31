'use client';

import Link from 'next/link';
import type { Branch, Service, Staff } from '@/lib/types';
import { buildBookingHref, type BookingFlowState, type BookingStep } from '@/lib/booking-flow';
import styles from './booking.module.css';

interface BookingPrefillBarProps {
  businessId: string | number;
  flow: BookingFlowState;
  currentStep: BookingStep;
  service?: Service | null;
  branch?: Branch | null;
  staff?: Staff | null;
  customerPackageLabel?: string | null;
}

export default function BookingPrefillBar({
  businessId,
  flow,
  currentStep,
  service,
  branch,
  staff,
  customerPackageLabel,
}: BookingPrefillBarProps) {
  if (!flow.serviceId || (currentStep !== 'schedule' && currentStep !== 'confirm')) {
    return null;
  }

  const editServiceHref = buildBookingHref(businessId, {
    ...flow,
    step: 'service',
    date: '',
    slot: '',
  });

  const editDetailsHref = buildBookingHref(businessId, {
    ...flow,
    step: 'details',
    date: '',
    slot: '',
  });

  return (
    <div className={styles.prefillBar}>
      <span className={styles.prefillLabel}>
        <i className="fa-solid fa-list-check" /> Your selection
      </span>
      <div className={styles.prefillChips}>
        {service && (
          <span className={styles.prefillChip}>
            {service.name}
            <Link href={editServiceHref} className={styles.prefillEdit}>
              Edit
            </Link>
          </span>
        )}
        {branch && (
          <span className={styles.prefillChip}>
            {branch.name}
            <Link href={editDetailsHref} className={styles.prefillEdit}>
              Edit
            </Link>
          </span>
        )}
        {staff && (
          <span className={styles.prefillChip}>{staff.name}</span>
        )}
        {!staff && flow.staffId === '' && flow.step !== 'service' && flow.step !== 'details' && (
          <span className={styles.prefillChip}>Any specialist</span>
        )}
        {customerPackageLabel && (
          <span className={styles.prefillChip}>
            <i className="fa-solid fa-gift" /> {customerPackageLabel}
          </span>
        )}
      </div>
    </div>
  );
}

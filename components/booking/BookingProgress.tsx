'use client';

import { BOOKING_STEPS, stepIndex, type BookingStep } from '@/lib/booking-flow';
import styles from './booking.module.css';

interface BookingProgressProps {
  currentStep: BookingStep;
}

export default function BookingProgress({ currentStep }: BookingProgressProps) {
  const currentIdx = stepIndex(currentStep);
  const progressPct = ((currentIdx + 1) / BOOKING_STEPS.length) * 100;

  return (
    <div className={styles.progress} aria-label="Booking progress">
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
      </div>
      <div className={styles.steps}>
        {BOOKING_STEPS.map((step, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          const last = i === BOOKING_STEPS.length - 1;
          return (
            <div key={step.id} className={styles.stepItem}>
              <div className={styles.stepDotWrap}>
                {!last && (
                  <span className={`${styles.stepConnector} ${done ? styles.stepConnectorDone : ''}`} />
                )}
                <span
                  className={`${styles.stepDot} ${done ? styles.stepDotDone : ''} ${active ? styles.stepDotActive : ''}`}
                >
                  {done ? <i className="fa-solid fa-check" /> : i + 1}
                </span>
              </div>
              <span className={`${styles.stepLabel} ${active ? styles.stepLabelActive : ''} ${done ? styles.stepLabelDone : ''}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

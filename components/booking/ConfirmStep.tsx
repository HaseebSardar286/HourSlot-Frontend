'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { loginHref, registerHref } from '@/lib/auth-redirect';
import type { CustomerPackage } from '@/lib/types';
import styles from './booking.module.css';

export type PaymentChoice = 'ONLINE' | 'VENUE' | 'PACKAGE';

interface ConfirmStepProps {
  isAuthenticated: boolean;
  returnUrl: string;
  serviceId: string;
  paymentMethod: PaymentChoice;
  selectedPackageId: number | null;
  clientNotes: string;
  termsAccepted: boolean;
  submitting: boolean;
  onPaymentChange: (method: PaymentChoice) => void;
  onPackageSelect: (id: number | null) => void;
  onNotesChange: (notes: string) => void;
  onTermsChange: (accepted: boolean) => void;
  onConfirm: () => void;
}

export default function ConfirmStep({
  isAuthenticated,
  returnUrl,
  serviceId,
  paymentMethod,
  selectedPackageId,
  clientNotes,
  termsAccepted,
  submitting,
  onPaymentChange,
  onPackageSelect,
  onNotesChange,
  onTermsChange,
  onConfirm,
}: ConfirmStepProps) {
  const [eligiblePackages, setEligiblePackages] = useState<CustomerPackage[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !serviceId) {
      setEligiblePackages([]);
      return;
    }
    apiFetch<CustomerPackage[]>(`/api/customer/packages/eligible?serviceId=${serviceId}`)
      .then((data) => setEligiblePackages(data || []))
      .catch(() => setEligiblePackages([]));
  }, [isAuthenticated, serviceId]);

  if (!isAuthenticated) {
    return (
      <div className={styles.signInPanel}>
        <h3>Sign in to complete your booking</h3>
        <p>
          You&apos;ve chosen your service and time. Sign in or create a free account to confirm —
          your selections are saved.
        </p>
        <div className={styles.signInActions}>
          <Link href={loginHref(returnUrl)} className={styles.signInBtn}>
            <i className="fa-solid fa-right-to-bracket" /> Sign in to continue
          </Link>
          <Link href={registerHref(returnUrl, 'customer')} className={styles.signInSecondary}>
            Create free account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.payOptions}>
        <button
          type="button"
          className={`${styles.payOption} ${paymentMethod === 'ONLINE' ? styles.payOptionOn : ''}`}
          onClick={() => {
            onPaymentChange('ONLINE');
            onPackageSelect(null);
          }}
        >
          <span className={styles.payIcon}>
            <i className="fa-solid fa-credit-card" />
          </span>
          <div>
            <strong>Pay online</strong>
            <p>Secure card payment via Stripe</p>
          </div>
          <span className={styles.payRadio} />
        </button>
        <button
          type="button"
          className={`${styles.payOption} ${paymentMethod === 'VENUE' ? styles.payOptionOn : ''}`}
          onClick={() => {
            onPaymentChange('VENUE');
            onPackageSelect(null);
          }}
        >
          <span className={styles.payIcon}>
            <i className="fa-solid fa-store" />
          </span>
          <div>
            <strong>Pay at venue</strong>
            <p>Pay when you arrive</p>
          </div>
          <span className={styles.payRadio} />
        </button>
        {eligiblePackages.length > 0 && (
          <button
            type="button"
            className={`${styles.payOption} ${paymentMethod === 'PACKAGE' ? styles.payOptionOn : ''}`}
            onClick={() => onPaymentChange('PACKAGE')}
          >
            <span className={styles.payIcon}>
              <i className="fa-solid fa-gift" />
            </span>
            <div>
              <strong>Use package session</strong>
              <p>Redeem a remaining session</p>
            </div>
            <span className={styles.payRadio} />
          </button>
        )}
      </div>

      {paymentMethod === 'PACKAGE' && (
        <div className={styles.packageList}>
          {eligiblePackages.map((cp) => (
            <button
              key={cp.id}
              type="button"
              className={`${styles.packageChip} ${selectedPackageId === cp.id ? styles.packageChipOn : ''}`}
              onClick={() => onPackageSelect(cp.id)}
            >
              <strong>{cp.servicePackage.name}</strong>
              <span>{cp.sessionsRemaining} left</span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.notesBlock}>
        <label htmlFor="bookingNotes">Notes for the business (optional)</label>
        <textarea
          id="bookingNotes"
          value={clientNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Preferences, accessibility needs, or other details…"
        />
      </div>

      <label className={styles.terms}>
        <input type="checkbox" checked={termsAccepted} onChange={(e) => onTermsChange(e.target.checked)} />
        <span>I agree to the Terms &amp; Conditions and Cancellation Policy.</span>
      </label>

      <button
        type="button"
        className={`btn btn-primary ${styles.confirmBtn}`}
        onClick={onConfirm}
        disabled={submitting || !termsAccepted || (paymentMethod === 'PACKAGE' && !selectedPackageId)}
      >
        {submitting ? 'Booking…' : 'Confirm booking'}
        {!submitting && <i className="fa-solid fa-check" />}
      </button>
    </>
  );
}

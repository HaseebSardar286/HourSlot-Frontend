'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import CustomerFlowBar from '@/components/CustomerFlowBar';
import {
  buildBookingHref,
  formatFriendlyDate,
  formatFriendlyTime,
  loadConfirmationSnapshot,
  type BookingConfirmationSnapshot,
} from '@/lib/booking-flow';
import { loginHref } from '@/lib/auth-redirect';
import { formatMoney } from '@/lib/money';
import Skeleton from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import styles from './confirmation.module.css';

interface CustomerBooking {
  id: number;
  branch: { name: string; address?: string; business?: { id: number; name?: string } };
  service: { name: string; durationMinutes?: number; currency?: string };
  staff?: { name: string };
  bookingTime: string;
  price: number;
  currency?: string;
  paymentStatus?: string;
}

function ConfirmationContent() {
  const { businessId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get('bookingId');
  const paymentParam = searchParams.get('payment');
  const branchIdParam = searchParams.get('branchId');
  const packageIdParam = searchParams.get('customerPackageId');

  const [snapshot, setSnapshot] = useState<BookingConfirmationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const bookingId = bookingIdParam ? Number.parseInt(bookingIdParam, 10) : NaN;
      if (!Number.isFinite(bookingId)) {
        setLoading(false);
        return;
      }

      const cached = loadConfirmationSnapshot(bookingId);
      if (cached) {
        setSnapshot(cached);
        setLoading(false);
        return;
      }

      try {
        const bookings = await apiFetch<CustomerBooking[]>('/api/customer/bookings');
        const match = bookings.find((b) => b.id === bookingId);
        if (match) {
          const dt = match.bookingTime;
          setSnapshot({
            bookingId: match.id,
            businessId: Number(businessId),
            businessName: match.branch.business?.name || '',
            serviceName: match.service.name,
            branchName: match.branch.name,
            branchAddress: match.branch.address,
            staffName: match.staff?.name,
            bookingTime: dt,
            price: match.price,
            currency: match.currency || match.service.currency,
            paymentMethod: paymentParam === 'ONLINE' ? 'ONLINE' : paymentParam === 'PACKAGE' ? 'PACKAGE' : 'VENUE',
            durationMinutes: match.service.durationMinutes,
          });
        }
      } catch {
        /* guest or fetch failed */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookingIdParam, businessId, paymentParam]);

  if (loading) {
    return (
      <div className={styles.confirmPage}>
        <Skeleton variant="card" height={420} />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className={styles.confirmPage}>
        <CustomerFlowBar businessId={businessId as string} current="confirm" />
        <EmptyState
          icon="fa-calendar-check"
          title="Booking not found"
          description="We could not load your confirmation details. Sign in to view your bookings or explore more services."
          actionLabel="Explore services"
          onAction={() => router.push('/profile/explore')}
        />
        <p className={styles.altLinks}>
          <Link href={loginHref(`/profile/book/${businessId}/confirmation?bookingId=${bookingIdParam || ''}`)}>
            Sign in to view booking
          </Link>
        </p>
      </div>
    );
  }

  const dt = snapshot.bookingTime;
  const datePart = dt.includes('T') ? dt.split('T')[0] : dt.slice(0, 10);
  const timePart = dt.includes('T') ? dt.split('T')[1]?.slice(0, 5) : '';
  const money = (n: number) => formatMoney(n, snapshot.currency);

  const paymentLabel =
    snapshot.paymentMethod === 'ONLINE'
      ? 'Pay online (Stripe)'
      : snapshot.paymentMethod === 'PACKAGE'
        ? 'Package session'
        : 'Pay at venue';

  const bookAgainHref = buildBookingHref(businessId as string, {
    step: 'service',
    branchId: branchIdParam || undefined,
    customerPackageId: packageIdParam || undefined,
  });

  return (
    <div className={styles.confirmPage}>
      <CustomerFlowBar
        businessId={businessId as string}
        businessName={snapshot.businessName}
        current="confirm"
      />
      <div className={styles.card}>
        <div className={styles.icon}>
          <i className="fa-solid fa-circle-check" />
        </div>
        <h1>You&apos;re booked!</h1>
        <p className={styles.lead}>
          {snapshot.businessName ? `${snapshot.businessName} — ` : ''}
          Your appointment is confirmed. We&apos;ve saved the details below.
        </p>

        <div className={styles.details}>
          <div className={styles.row}>
            <span>Service</span>
            <strong>{snapshot.serviceName}</strong>
          </div>
          <div className={styles.row}>
            <span>Location</span>
            <strong>{snapshot.branchName}</strong>
          </div>
          {snapshot.staffName && (
            <div className={styles.row}>
              <span>Specialist</span>
              <strong>{snapshot.staffName}</strong>
            </div>
          )}
          <div className={styles.row}>
            <span>Date</span>
            <strong>{formatFriendlyDate(datePart)}</strong>
          </div>
          {timePart && (
            <div className={styles.row}>
              <span>Time</span>
              <strong>{formatFriendlyTime(timePart)}</strong>
            </div>
          )}
          {snapshot.durationMinutes && (
            <div className={styles.row}>
              <span>Duration</span>
              <strong>{snapshot.durationMinutes} min</strong>
            </div>
          )}
          <div className={styles.row}>
            <span>Payment</span>
            <strong>{paymentLabel}</strong>
          </div>
          {snapshot.paymentMethod !== 'PACKAGE' && (
            <div className={styles.row}>
              <span>Total</span>
              <strong>{money(snapshot.price)}</strong>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <Link href="/profile/bookings" className={styles.primary}>
            <i className="fa-solid fa-calendar" /> View my bookings
          </Link>
          <Link href={bookAgainHref} className={styles.textLink}>
            Book another appointment
          </Link>
        </div>

        <div className={styles.secondaryLinks}>
          <Link href={`/profile/business/${businessId}`}>Back to business</Link>
          <Link href="/profile/explore">Explore more</Link>
        </div>

        {snapshot.paymentMethod === 'ONLINE' && (
          <p className={styles.paymentNote}>
            If you were redirected from Stripe, payment status will update in My bookings shortly.
          </p>
        )}
      </div>
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.confirmPage}>
          <Skeleton variant="card" height={420} />
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}

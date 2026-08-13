'use client';

import { Suspense, useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import Tabs from '@/components/Tabs';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import FormField from '@/components/FormField';
import styles from './my-bookings.module.css';

interface Branch {
  id: number;
  name: string;
  address: string;
}

interface Service {
  id: number;
  name: string;
  price: number;
  durationMinutes: number;
}

interface Staff {
  id: number;
  name: string;
}

interface Booking {
  id: number;
  branch: Branch;
  service: Service;
  staff?: Staff;
  bookingTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'IN_PROGRESS' | 'RESCHEDULED';
  price: number;
  paymentStatus?: string;
}

function MyBookingsContent() {
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<number[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    bookingId: 0,
    rating: 5,
    comment: '',
  });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([]);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [payingId, setPayingId] = useState<number | null>(null);

  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') setSuccess('Payment completed successfully.');
    if (payment === 'cancelled') setError('Online payment was cancelled.');
  }, [searchParams]);

  useEffect(() => {
    const fetchRescheduleSlots = async () => {
      if (!reschedulingBooking || !rescheduleDate) {
        setRescheduleSlots([]);
        return;
      }
      setRescheduleSlotsLoading(true);
      setSelectedRescheduleSlot('');
      try {
        let url = `/api/public/branches/${reschedulingBooking.branch.id}/slots?serviceId=${reschedulingBooking.service.id}&date=${rescheduleDate}`;
        if (reschedulingBooking.staff?.id) {
          url += `&staffId=${reschedulingBooking.staff.id}`;
        }
        const slots = await apiFetch<string[]>(url, { skipAuth: true });
        setRescheduleSlots(slots || []);
      } catch {
        setRescheduleSlots([]);
      } finally {
        setRescheduleSlotsLoading(false);
      }
    };
    fetchRescheduleSlots();
  }, [reschedulingBooking, rescheduleDate]);

  const handleOpenRescheduleModal = (booking: Booking) => {
    setReschedulingBooking(booking);
    const todayStr = new Date().toISOString().split('T')[0];
    setRescheduleDate(todayStr);
    setSelectedRescheduleSlot('');
    setShowRescheduleModal(true);
  };

  const handleRescheduleSubmit = async () => {
    if (!reschedulingBooking || !rescheduleDate || !selectedRescheduleSlot) return;
    setRescheduleSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const bookingTimeStr = `${rescheduleDate}T${selectedRescheduleSlot}`;
      await apiFetch(
        `/api/bookings/${reschedulingBooking.id}/reschedule?bookingTime=${encodeURIComponent(bookingTimeStr)}`,
        { method: 'PUT' }
      );
      setSuccess('Appointment rescheduled successfully.');
      setShowRescheduleModal(false);
      await loadBookings();
    } catch (err: any) {
      setError(err?.message || 'Failed to reschedule appointment.');
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Booking[]>('/api/customer/bookings');
      setBookings(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    const result = bookings.filter((b) => {
      const isUpcoming =
        b.status === 'PENDING' ||
        b.status === 'CONFIRMED' ||
        b.status === 'IN_PROGRESS' ||
        b.status === 'RESCHEDULED';
      if (activeTab === 'upcoming') return isUpcoming;
      return !isUpcoming;
    });
    setFilteredBookings(result);
  }, [bookings, activeTab]);

  const handleCancelConfirm = async () => {
    if (cancelId == null) return;
    setCancelLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/api/customer/bookings/${cancelId}/cancel`, { method: 'PUT' });
      setSuccess('Appointment cancelled successfully.');
      setCancelId(null);
      await loadBookings();
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel appointment.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handlePayOnline = async (bookingId: number) => {
    setPayingId(bookingId);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiFetch<{ url: string }>(`/api/payments/checkout?bookingId=${bookingId}`, {
        method: 'POST',
      });
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Could not start checkout.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to start online payment.');
      setPayingId(null);
    }
  };

  const handleOpenReviewModal = (bookingId: number) => {
    setReviewForm({ bookingId, rating: 5, comment: '' });
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setReviewSubmitting(true);
    try {
      await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify(reviewForm),
      });
      setSuccess('Review submitted. Thank you for your feedback!');
      setReviewedBookingIds((prev) => [...prev, reviewForm.bookingId]);
      setShowReviewModal(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const formatDateTime = (isoStr: string) => {
    const d = new Date(isoStr);
    const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${date} at ${time}`;
  };

  const needsPayment = (b: Booking) => {
    const unpaid =
      !b.paymentStatus ||
      b.paymentStatus.toUpperCase() === 'UNPAID' ||
      b.paymentStatus.toUpperCase() === 'PENDING';
    const active = b.status === 'PENDING' || b.status === 'CONFIRMED' || b.status === 'RESCHEDULED';
    return unpaid && active;
  };

  return (
    <div className={styles.bookingsContainer}>
      <PageHeader
        title="My bookings"
        subtitle="Upcoming appointments, history, reschedule, and pay online."
        actions={
          <Link href="/profile/explore" className="btn btn-primary btn-sm">
            Book new
          </Link>
        }
      />

      {success && (
        <div className="success-alert" style={{ marginBottom: 16 }}>
          <i className="fa-solid fa-circle-check" /> {success}
        </div>
      )}
      {error && (
        <div className="error-alert" style={{ marginBottom: 16 }}>
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      <Tabs
        tabs={[
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'past', label: 'Past & cancelled' },
        ]}
        active={activeTab}
        onChange={(id) => setActiveTab(id as 'upcoming' | 'past')}
      />

      {loading ? (
        <div className={styles.skeletonList}>
          <Skeleton variant="row" count={4} />
        </div>
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          icon="fa-calendar"
          title="No appointments found"
          description="You don’t have any appointments in this category."
          actionLabel="Explore services"
          onAction={() => {
            window.location.href = '/profile/explore';
          }}
        />
      ) : (
        <div className={styles.bookingsList}>
          {filteredBookings.map((b) => {
            const hasReviewed = reviewedBookingIds.includes(b.id);
            return (
              <div key={b.id} className={`surface ${styles.bookingCard}`}>
                <div className={styles.cardHeader}>
                  <div>
                    <div className={styles.badgeRow}>
                      <StatusBadge status={b.status} />
                      {b.paymentStatus && <StatusBadge status={b.paymentStatus} />}
                    </div>
                    <h4>{b.service.name}</h4>
                    <p className={styles.branchName}>
                      <i className="fa-solid fa-shop" /> {b.branch.name}
                    </p>
                  </div>
                  <span className={styles.price}>${b.price.toFixed(2)}</span>
                </div>

                <div className={styles.cardBody}>
                  <p className={styles.timeText}>
                    <i className="fa-regular fa-calendar" /> {formatDateTime(b.bookingTime)}
                  </p>
                  <p className={styles.specialist}>
                    <i className="fa-solid fa-user-doctor" /> {b.staff?.name || 'Any available specialist'}
                  </p>
                </div>

                <div className={styles.cardFooter}>
                  {activeTab === 'upcoming' && b.status !== 'IN_PROGRESS' && (
                    <>
                      {needsPayment(b) && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handlePayOnline(b.id)}
                          disabled={payingId === b.id}
                        >
                          {payingId === b.id ? 'Redirecting…' : 'Pay online'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => handleOpenRescheduleModal(b)}
                      >
                        Reschedule
                      </button>
                      <button
                        type="button"
                        className={`btn btn-outline btn-sm ${styles.cancelBtn}`}
                        onClick={() => setCancelId(b.id)}
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {b.status === 'COMPLETED' &&
                    (hasReviewed ? (
                      <span className={styles.reviewedBadge}>
                        <i className="fa-solid fa-check-double" /> Reviewed
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => handleOpenReviewModal(b.id)}
                      >
                        Rate & review
                      </button>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={showReviewModal}
        title="Submit review"
        onClose={() => setShowReviewModal(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShowReviewModal(false)}>
              Cancel
            </button>
            <button
              type="submit"
              form="review-form"
              className="btn btn-primary"
              disabled={reviewSubmitting}
            >
              {reviewSubmitting ? 'Submitting…' : 'Submit review'}
            </button>
          </>
        }
      >
        <form id="review-form" onSubmit={handleReviewSubmit} className={styles.modalForm}>
          <div className="form-group">
            <label className="form-label">Overall rating</label>
            <div className={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  aria-label={`Rate ${star} stars`}
                  onClick={() => setReviewForm((prev) => ({ ...prev, rating: star }))}
                >
                  <i className={`fa-${reviewForm.rating >= star ? 'solid' : 'regular'} fa-star`} />
                </button>
              ))}
            </div>
          </div>
          <FormField
            as="textarea"
            label="Comment (optional)"
            htmlFor="reviewComment"
            value={reviewForm.comment}
            onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
            placeholder="Share your experience…"
            rows={4}
          />
        </form>
      </Modal>

      <Modal
        open={showRescheduleModal}
        title="Reschedule appointment"
        onClose={() => setShowRescheduleModal(false)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowRescheduleModal(false)}
              disabled={rescheduleSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRescheduleSubmit}
              disabled={rescheduleSubmitting || !selectedRescheduleSlot}
            >
              {rescheduleSubmitting ? 'Rescheduling…' : 'Confirm reschedule'}
            </button>
          </>
        }
      >
        <div className={styles.modalForm}>
          <FormField
            label="Select date"
            htmlFor="reschedule-date"
            type="date"
            value={rescheduleDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setRescheduleDate(e.target.value)}
          />

          <div className="form-group">
            <label className="form-label">Available slots</label>
            {rescheduleSlotsLoading ? (
              <Skeleton variant="row" count={2} />
            ) : rescheduleSlots.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
                No available slots for this date.
              </p>
            ) : (
              <div className={styles.slotGrid}>
                {rescheduleSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={`${styles.slotBtn} ${selectedRescheduleSlot === slot ? styles.slotBtnSelected : ''}`}
                    onClick={() => setSelectedRescheduleSlot(slot)}
                  >
                    {slot.substring(0, 5)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={cancelId != null}
        title="Cancel appointment?"
        message="Are you sure you want to cancel this appointment? This cannot be undone."
        confirmLabel="Cancel booking"
        danger
        loading={cancelLoading}
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelId(null)}
      />
    </div>
  );
}

export default function MyBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.bookingsContainer}>
          <Skeleton variant="title" />
          <Skeleton variant="row" count={3} />
        </div>
      }
    >
      <MyBookingsContent />
    </Suspense>
  );
}

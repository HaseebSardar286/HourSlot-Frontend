'use client';

import { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
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
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'IN_PROGRESS';
  price: number;
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<number[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter Tabs: 'upcoming' or 'past'
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  // Review Modal States
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    bookingId: 0,
    rating: 5,
    comment: '',
  });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Booking[]>('/api/customer/bookings');
      setBookings(data);
      
      // Look up existing reviews to check which bookings have already been reviewed
      // Note: We can fetch reviews for the booking directly if needed, or check if the API returns a flag.
      // A quick check is to see if review submission fails for reviewed bookings. But we can also look up reviews by customer or business.
      // For this, we'll store reviewed booking IDs locally after submission.
    } catch (err: any) {
      setError(err?.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  // Filter bookings based on tab
  useEffect(() => {
    const result = bookings.filter((b) => {
      const isUpcoming = b.status === 'PENDING' || b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS';
      if (activeTab === 'upcoming') return isUpcoming;
      return !isUpcoming; // COMPLETED, CANCELLED, NO_SHOW
    });
    setFilteredBookings(result);
  }, [bookings, activeTab]);

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/api/customer/bookings/${bookingId}/cancel`, {
        method: 'PUT',
      });
      setSuccess('Appointment cancelled successfully.');
      await loadBookings();
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel appointment.');
    }
  };

  const handleOpenReviewModal = (bookingId: number) => {
    setReviewForm({
      bookingId,
      rating: 5,
      comment: '',
    });
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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING': return styles.badgePending;
      case 'CONFIRMED': return styles.badgeConfirmed;
      case 'COMPLETED': return styles.badgeCompleted;
      case 'CANCELLED': return styles.badgeCancelled;
      case 'NO_SHOW': return styles.badgeNoShow;
      case 'IN_PROGRESS': return styles.badgeInProgress;
      default: return '';
    }
  };

  const formatDateTime = (isoStr: string) => {
    const d = new Date(isoStr);
    const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${date} at ${time}`;
  };

  return (
    <div className={styles.bookingsContainer}>
      <div className={styles.headerRow}>
        <h2>My Scheduled Appointments</h2>
      </div>

      {success && <div className="success-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-circle-check"></i> {success}</div>}
      {error && <div className="error-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-triangle-exclamation"></i> {error}</div>}

      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'upcoming' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming appointments
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'past' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('past')}
        >
          Past & cancelled history
        </button>
      </div>

      {loading ? (
        <div className={styles.loaderContainer}>
          <div className="spinner" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📅</div>
          <h3>No appointments found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>You don't have any appointments in this category.</p>
        </div>
      ) : (
        <div className={styles.bookingsList}>
          {filteredBookings.map((b) => {
            const hasReviewed = reviewedBookingIds.includes(b.id);
            return (
              <div key={b.id} className={styles.bookingCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <span className={getStatusBadgeClass(b.status)}>{b.status}</span>
                    <h4>{b.service.name}</h4>
                    <p className={styles.branchName}><i className="fa-solid fa-shop"></i> {b.branch.name}</p>
                  </div>
                  <span className={styles.price}>${b.price.toFixed(2)}</span>
                </div>

                <div className={styles.cardBody}>
                  <p className={styles.timeText}>
                    <i className="fa-regular fa-calendar"></i> {formatDateTime(b.bookingTime)}
                  </p>
                  <p className={styles.specialist}>
                    <i className="fa-solid fa-user-doctor"></i> specialist: {b.staff?.name || 'Any Available Specialist'}
                  </p>
                </div>

                <div className={styles.cardFooter}>
                  {activeTab === 'upcoming' && b.status !== 'IN_PROGRESS' && (
                    <button 
                      className={`btn btn-sm ${styles.cancelBtn}`}
                      onClick={() => handleCancelBooking(b.id)}
                    >
                      Cancel Booking
                    </button>
                  )}

                  {b.status === 'COMPLETED' && (
                    hasReviewed ? (
                      <span className={styles.reviewedBadge}><i className="fa-solid fa-check-double"></i> Reviewed</span>
                    ) : (
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => handleOpenReviewModal(b.id)}
                      >
                        Rate & Review
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal Overlay */}
      {showReviewModal && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modalContent}`}>
            <div className={styles.modalHeader}>
              <h3>Submit Service Review</h3>
              <button className={styles.closeBtn} onClick={() => setShowReviewModal(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label">Overall Rating</label>
                <div className={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <i 
                      key={star} 
                      className={`fa-${reviewForm.rating >= star ? 'solid' : 'regular'} fa-star`}
                      style={{ cursor: 'pointer', fontSize: '1.8rem', color: '#f59e0b', marginRight: '6px' }}
                      onClick={() => setReviewForm((prev) => ({ ...prev, rating: star }))}
                    ></i>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reviewComment">Review Comment (Optional)</label>
                <textarea
                  id="reviewComment"
                  className="input-field"
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                  placeholder="Share your experience with the service provider..."
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '10px' }}
                disabled={reviewSubmitting}
              >
                {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import styles from './bookings.module.css';

interface Branch {
  id: number;
  name: string;
}

interface Customer {
  id: number;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface Service {
  id: number;
  name: string;
  durationMinutes: number;
}

interface Staff {
  id: number;
  name: string;
}

interface Booking {
  id: number;
  customer: Customer;
  branch: Branch;
  service: Service;
  staff?: Staff;
  bookingTime: string; // ISO String
  endTime: string;     // ISO String
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'IN_PROGRESS';
  price: number;
}

export default function BookingsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);

  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'past'>('today');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const branchData = await apiFetch<Branch[]>('/api/business/branches');
      setBranches(branchData);
      if (branchData.length > 0) {
        setSelectedBranchId(branchData[0].id.toString());
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load branches.');
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async (branchId: string) => {
    if (!branchId) return;
    setBookingsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Booking[]>(`/api/bookings/branch/${branchId}`);
      setBookings(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load bookings.');
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      loadBookings(selectedBranchId);
    }
  }, [selectedBranchId]);

  // Apply tab filters & search query
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    let result = bookings.filter((booking) => {
      const bookingDateStr = booking.bookingTime.split('T')[0];
      const isToday = bookingDateStr === todayStr;
      const isFuture = bookingDateStr > todayStr;
      const isPast = bookingDateStr < todayStr;

      // Tab filtering
      if (activeTab === 'today') {
        // Today's bookings should not include cancelled/completed history unless explicitly requested
        return isToday && booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED';
      }
      if (activeTab === 'upcoming') {
        return isFuture && booking.status !== 'CANCELLED';
      }
      if (activeTab === 'past') {
        return isPast || booking.status === 'CANCELLED' || booking.status === 'COMPLETED' || booking.status === 'NO_SHOW';
      }
      return true;
    });

    if (statusFilter !== 'ALL') {
      result = result.filter((b) => b.status === statusFilter);
    }

    // Search query filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((b) => {
        const custName = `${b.customer.user.firstName} ${b.customer.user.lastName}`.toLowerCase();
        const serviceName = b.service.name.toLowerCase();
        const staffName = b.staff?.name.toLowerCase() || '';
        return custName.includes(query) || serviceName.includes(query) || staffName.includes(query);
      });
    }

    setFilteredBookings(result);
  }, [bookings, activeTab, searchQuery, statusFilter]);

  const nextStatuses = (status: string): string[] => {
    switch (status) {
      case 'PENDING':
        return ['CONFIRMED', 'CANCELLED'];
      case 'CONFIRMED':
        return ['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
      case 'IN_PROGRESS':
        return ['COMPLETED', 'CANCELLED', 'NO_SHOW'];
      case 'RESCHEDULED':
        return ['CONFIRMED', 'CANCELLED'];
      default:
        return [];
    }
  };

  const handleUpdateStatus = async (bookingId: number, status: string) => {
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      setSuccess(`Booking status updated to ${status}!`);
      if (selectedBranchId) {
        await loadBookings(selectedBranchId);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update booking status.');
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

  const formatBookingDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatBookingTime = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className={styles.bookingsContainer}>
      <div className={styles.headerRow}>
        <div className={styles.branchSelectArea}>
          <label className="form-label" htmlFor="bookingsBranchSelect" style={{ marginBottom: 0 }}>
            Branch:
          </label>
          <select
            id="bookingsBranchSelect"
            className="input-field"
            style={{ width: '220px', padding: '6px 12px' }}
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {success && <div className="success-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-circle-check"></i> {success}</div>}
      {error && <div className="error-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-triangle-exclamation"></i> {error}</div>}

      {branches.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📅</div>
          <h3>No Branches Found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>You must configure a branch before you can manage bookings.</p>
        </div>
      ) : (
        <>
          <div className={styles.controlsArea}>
            <div className={styles.tabsContainer}>
              <button
                className={`${styles.tabBtn} ${activeTab === 'today' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('today')}
              >
                <i className="fa-solid fa-calendar-day"></i> Today
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'upcoming' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('upcoming')}
              >
                <i className="fa-solid fa-calendar-days"></i> Upcoming
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'past' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('past')}
              >
                <i className="fa-solid fa-clock-rotate-left"></i> History
              </button>
            </div>

            <div className={styles.searchBox}>
              <i className="fa-solid fa-magnifying-glass"></i>
              <input
                type="text"
                className={`input-field ${styles.searchInput}`}
                placeholder="Search name or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="input-field"
              style={{ width: 160 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NO_SHOW">No show</option>
            </select>
          </div>

          {bookingsLoading ? (
            <div className={styles.loaderContainer}>
              <div className="spinner" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="glass-card text-center" style={{ padding: '60px 20px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
              <h3>No Bookings Found</h3>
              <p style={{ color: 'var(--text-secondary)' }}>No scheduled appointments matched your current filters.</p>
            </div>
          ) : (
            <div className={styles.bookingsList}>
              {filteredBookings.map((b) => (
                <div key={b.id} className={styles.bookingCard}>
                  <div className={styles.mainInfo}>
                    <div className={styles.timeBlock}>
                      <span className={styles.timeHour}>{formatBookingTime(b.bookingTime)}</span>
                      <span className={styles.timeDate}>{formatBookingDate(b.bookingTime)}</span>
                    </div>

                    <div className={styles.detailsBlock}>
                      <div className={styles.serviceName}>
                        {b.service.name}
                        <span className={getStatusBadgeClass(b.status)}>{b.status}</span>
                      </div>
                      <div className={styles.customerName}>
                        <i className="fa-solid fa-user"></i> {b.customer.user.firstName} {b.customer.user.lastName}
                        <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 4px' }}>|</span>
                        <i className="fa-solid fa-envelope"></i> {b.customer.user.email}
                      </div>
                      <div className={styles.specialistName}>
                        <i className="fa-solid fa-user-doctor"></i> Specialist: {b.staff?.name || 'Any Available'}
                      </div>
                    </div>
                  </div>

                  <div className={styles.metaInfo}>
                    <div className={styles.priceText}>${b.price.toFixed(2)}</div>
                    
                    <div className={styles.actionArea}>
                      {nextStatuses(b.status).includes('CONFIRMED') && (
                        <button
                          className={`${styles.actionBtn} ${styles.btnComplete}`}
                          onClick={() => handleUpdateStatus(b.id, 'CONFIRMED')}
                          title="Confirm Booking"
                        >
                          <i className="fa-solid fa-check"></i> Confirm
                        </button>
                      )}
                      {nextStatuses(b.status).includes('IN_PROGRESS') && (
                        <button
                          className={`${styles.actionBtn} ${styles.btnComplete}`}
                          onClick={() => handleUpdateStatus(b.id, 'IN_PROGRESS')}
                          title="Start Service"
                        >
                          <i className="fa-solid fa-play"></i> Start
                        </button>
                      )}
                      {nextStatuses(b.status).includes('CANCELLED') && (
                        <button
                          className={`${styles.actionBtn} ${styles.btnCancel}`}
                          onClick={() => handleUpdateStatus(b.id, 'CANCELLED')}
                          title="Cancel Booking"
                        >
                          <i className="fa-solid fa-xmark"></i> Cancel
                        </button>
                      )}
                      {nextStatuses(b.status).includes('NO_SHOW') && (
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleUpdateStatus(b.id, 'NO_SHOW')}
                          title="Mark as No-Show"
                        >
                          <i className="fa-solid fa-user-slash"></i> No Show
                        </button>
                      )}

                      {nextStatuses(b.status).includes('COMPLETED') && (
                        <button
                          className={`${styles.actionBtn} ${styles.btnComplete}`}
                          onClick={() => handleUpdateStatus(b.id, 'COMPLETED')}
                          title="Complete Service"
                        >
                          <i className="fa-solid fa-circle-check"></i> Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

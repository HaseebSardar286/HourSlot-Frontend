'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import FilterBar from '@/components/FilterBar';
import Tabs from '@/components/Tabs';
import Modal from '@/components/Modal';
import CalendarView, { CalendarEvent } from '@/components/CalendarView';
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
  bookingTime: string;
  endTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'IN_PROGRESS' | 'RESCHEDULED';
  price: number;
}

function bookingDateKey(iso: string) {
  return iso.split('T')[0];
}

function bookingTimeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
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

  const [listTab, setListTab] = useState<'today' | 'upcoming' | 'past'>('today');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([]);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedBooking || !rescheduleDate) {
        setRescheduleSlots([]);
        return;
      }
      setRescheduleSlotsLoading(true);
      setSelectedRescheduleSlot('');
      try {
        let url = `/api/public/branches/${selectedBooking.branch.id}/slots?serviceId=${selectedBooking.service.id}&date=${rescheduleDate}`;
        if (selectedBooking.staff?.id) {
          url += `&staffId=${selectedBooking.staff.id}`;
        }
        const slots = await apiFetch<string[]>(url, { skipAuth: true });
        setRescheduleSlots(slots || []);
      } catch {
        setRescheduleSlots([]);
      } finally {
        setRescheduleSlotsLoading(false);
      }
    };
    if (isRescheduling) {
      fetchSlots();
    }
  }, [selectedBooking, rescheduleDate, isRescheduling]);

  const openBooking = (id: number) => {
    const booking = bookings.find((b) => b.id === id);
    if (booking) {
      setSelectedBooking(booking);
      setIsRescheduling(false);
      setShowDetailsModal(true);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedBooking || !rescheduleDate || !selectedRescheduleSlot) return;
    setRescheduleSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const bookingTimeStr = `${rescheduleDate}T${selectedRescheduleSlot}`;
      await apiFetch(`/api/bookings/${selectedBooking.id}/reschedule?bookingTime=${encodeURIComponent(bookingTimeStr)}`, {
        method: 'PUT',
      });
      setSuccess('Appointment rescheduled successfully.');
      setShowDetailsModal(false);
      if (selectedBranchId) {
        await loadBookings(selectedBranchId);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to reschedule appointment.');
    } finally {
      setRescheduleSubmitting(false);
    }
  };

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

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    let result = bookings.filter((booking) => {
      const bookingDateStr = bookingDateKey(booking.bookingTime);
      const isToday = bookingDateStr === todayStr;
      const isFuture = bookingDateStr > todayStr;
      const isPast = bookingDateStr < todayStr;

      if (listTab === 'today') {
        return isToday && booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED';
      }
      if (listTab === 'upcoming') {
        return isFuture && booking.status !== 'CANCELLED';
      }
      if (listTab === 'past') {
        return isPast || booking.status === 'CANCELLED' || booking.status === 'COMPLETED' || booking.status === 'NO_SHOW';
      }
      return true;
    });

    if (statusFilter !== 'ALL') {
      result = result.filter((b) => b.status === statusFilter);
    }

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
  }, [bookings, listTab, searchQuery, statusFilter]);

  const calendarEvents: CalendarEvent[] = useMemo(
    () =>
      bookings.map((b) => ({
        id: b.id,
        date: bookingDateKey(b.bookingTime),
        title: `${b.service.name} · ${b.customer.user.firstName} ${b.customer.user.lastName}`,
        time: bookingTimeLabel(b.bookingTime),
      })),
    [bookings]
  );

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
      if (selectedBooking?.id === bookingId) {
        setShowDetailsModal(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update booking status.');
    }
  };

  const formatBookingDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className={styles.bookingsContainer}>
        <Skeleton variant="title" />
        <Skeleton variant="row" count={4} />
      </div>
    );
  }

  return (
    <div className={styles.bookingsContainer}>
      <PageHeader
        title="Bookings"
        subtitle="Manage appointments by list or calendar, update status, and reschedule when needed."
        actions={
          branches.length > 0 ? (
            <select
              className="select-field"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              aria-label="Select branch"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          ) : undefined
        }
      />

      {success && (
        <div className="success-alert">
          <i className="fa-solid fa-circle-check" /> {success}
        </div>
      )}
      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      {branches.length === 0 ? (
        <EmptyState
          icon="fa-calendar-days"
          title="No branches found"
          description="Configure a branch before you can manage bookings."
          actionLabel="Add branch"
          onAction={() => {
            window.location.href = '/business/branches';
          }}
        />
      ) : (
        <>
          <Tabs
            tabs={[
              { id: 'list', label: 'List' },
              { id: 'calendar', label: 'Calendar' },
            ]}
            active={viewMode}
            onChange={(id) => setViewMode(id as 'list' | 'calendar')}
          />

          {viewMode === 'list' ? (
            <>
              <Tabs
                tabs={[
                  { id: 'today', label: 'Today' },
                  { id: 'upcoming', label: 'Upcoming' },
                  { id: 'past', label: 'History' },
                ]}
                active={listTab}
                onChange={(id) => setListTab(id as typeof listTab)}
              />
              <FilterBar>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Search name or service..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select
                  className="select-field"
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
              </FilterBar>

              {bookingsLoading ? (
                <Skeleton variant="row" count={5} />
              ) : filteredBookings.length === 0 ? (
                <EmptyState
                  icon="fa-inbox"
                  title="No bookings found"
                  description="No scheduled appointments matched your current filters."
                />
              ) : (
                <div className={styles.bookingsList}>
                  {filteredBookings.map((b) => (
                    <div
                      key={b.id}
                      className={`surface ${styles.bookingCard}`}
                      onClick={() => openBooking(b.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') openBooking(b.id);
                      }}
                    >
                      <div className={styles.mainInfo}>
                        <div className={styles.timeBlock}>
                          <span className={styles.timeHour}>{bookingTimeLabel(b.bookingTime)}</span>
                          <span className={styles.timeDate}>{formatBookingDate(b.bookingTime)}</span>
                        </div>
                        <div className={styles.detailsBlock}>
                          <div className={styles.serviceName}>
                            {b.service.name}
                            <StatusBadge status={b.status} />
                          </div>
                          <div className={styles.metaLine}>
                            <i className="fa-solid fa-user" /> {b.customer.user.firstName} {b.customer.user.lastName}
                            <span className={styles.sep}>·</span>
                            <i className="fa-solid fa-envelope" /> {b.customer.user.email}
                          </div>
                          <div className={styles.metaLine}>
                            <i className="fa-solid fa-user-doctor" /> {b.staff?.name || 'Any available'}
                          </div>
                        </div>
                      </div>

                      <div className={styles.metaInfo} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.priceText}>${b.price.toFixed(2)}</div>
                        <div className={styles.actionArea}>
                          {nextStatuses(b.status).includes('CONFIRMED') && (
                            <button type="button" className="btn btn-sm btn-primary" onClick={() => handleUpdateStatus(b.id, 'CONFIRMED')}>
                              Confirm
                            </button>
                          )}
                          {nextStatuses(b.status).includes('IN_PROGRESS') && (
                            <button type="button" className="btn btn-sm btn-primary" onClick={() => handleUpdateStatus(b.id, 'IN_PROGRESS')}>
                              Start
                            </button>
                          )}
                          {nextStatuses(b.status).includes('COMPLETED') && (
                            <button type="button" className="btn btn-sm btn-primary" onClick={() => handleUpdateStatus(b.id, 'COMPLETED')}>
                              Complete
                            </button>
                          )}
                          {nextStatuses(b.status).includes('NO_SHOW') && (
                            <button type="button" className="btn btn-sm btn-outline" onClick={() => handleUpdateStatus(b.id, 'NO_SHOW')}>
                              No show
                            </button>
                          )}
                          {nextStatuses(b.status).includes('CANCELLED') && (
                            <button type="button" className="btn btn-sm btn-danger" onClick={() => handleUpdateStatus(b.id, 'CANCELLED')}>
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : bookingsLoading ? (
            <Skeleton variant="card" height={420} />
          ) : (
            <CalendarView
              month={calendarMonth}
              events={calendarEvents}
              onMonthChange={setCalendarMonth}
              onEventClick={(ev) => openBooking(Number(ev.id))}
            />
          )}
        </>
      )}

      <Modal
        open={showDetailsModal && !!selectedBooking}
        title="Booking details"
        onClose={() => setShowDetailsModal(false)}
        footer={
          selectedBooking ? (
            <>
              {!isRescheduling &&
                selectedBooking.status !== 'CANCELLED' &&
                selectedBooking.status !== 'COMPLETED' && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setIsRescheduling(true);
                      setRescheduleDate(new Date().toISOString().split('T')[0]);
                    }}
                  >
                    Reschedule
                  </button>
                )}
              <button type="button" className="btn btn-outline" onClick={() => setShowDetailsModal(false)}>
                Close
              </button>
              {isRescheduling && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleRescheduleSubmit}
                  disabled={rescheduleSubmitting || !selectedRescheduleSlot}
                >
                  {rescheduleSubmitting ? 'Saving...' : 'Confirm reschedule'}
                </button>
              )}
            </>
          ) : null
        }
      >
        {selectedBooking &&
          (isRescheduling ? (
            <div className={styles.modalStack}>
              <div className="form-group">
                <label className="form-label" htmlFor="business-reschedule-date">
                  Select new date
                </label>
                <input
                  id="business-reschedule-date"
                  type="date"
                  className="input-field"
                  value={rescheduleDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Available slots</label>
                {rescheduleSlotsLoading ? (
                  <Skeleton variant="row" count={2} />
                ) : rescheduleSlots.length === 0 ? (
                  <p className={styles.muted}>No available slots for this date.</p>
                ) : (
                  <div className={styles.slotGrid}>
                    {rescheduleSlots.map((slot) => {
                      const isSelected = selectedRescheduleSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          className={`${styles.slotBtn} ${isSelected ? styles.slotSelected : ''}`}
                          onClick={() => setSelectedRescheduleSlot(slot)}
                        >
                          {slot.substring(0, 5)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.modalStack}>
              <div className={styles.detailTop}>
                <StatusBadge status={selectedBooking.status} />
                <span className={styles.priceText}>${selectedBooking.price.toFixed(2)}</span>
              </div>
              <div>
                <h3 className={styles.detailTitle}>{selectedBooking.service.name}</h3>
                <p className={styles.muted}>
                  <i className="fa-regular fa-clock" /> {selectedBooking.service.durationMinutes} minutes
                </p>
              </div>
              <div className={styles.detailSection}>
                <h5>Customer</h5>
                <p className={styles.strong}>
                  {selectedBooking.customer.user.firstName} {selectedBooking.customer.user.lastName}
                </p>
                <p className={styles.muted}>{selectedBooking.customer.user.email}</p>
              </div>
              <div className={styles.detailSection}>
                <h5>Schedule</h5>
                <p>
                  {formatBookingDate(selectedBooking.bookingTime)} at {bookingTimeLabel(selectedBooking.bookingTime)}
                </p>
                <p className={styles.muted}>Specialist: {selectedBooking.staff?.name || 'Any available'}</p>
              </div>
              <div className={styles.actionArea}>
                {nextStatuses(selectedBooking.status).includes('CONFIRMED') && (
                  <button type="button" className="btn btn-primary" onClick={() => handleUpdateStatus(selectedBooking.id, 'CONFIRMED')}>
                    Confirm
                  </button>
                )}
                {nextStatuses(selectedBooking.status).includes('IN_PROGRESS') && (
                  <button type="button" className="btn btn-primary" onClick={() => handleUpdateStatus(selectedBooking.id, 'IN_PROGRESS')}>
                    Start
                  </button>
                )}
                {nextStatuses(selectedBooking.status).includes('COMPLETED') && (
                  <button type="button" className="btn btn-primary" onClick={() => handleUpdateStatus(selectedBooking.id, 'COMPLETED')}>
                    Complete
                  </button>
                )}
                {nextStatuses(selectedBooking.status).includes('NO_SHOW') && (
                  <button type="button" className="btn btn-outline" onClick={() => handleUpdateStatus(selectedBooking.id, 'NO_SHOW')}>
                    No show
                  </button>
                )}
                {nextStatuses(selectedBooking.status).includes('CANCELLED') && (
                  <button type="button" className="btn btn-danger" onClick={() => handleUpdateStatus(selectedBooking.id, 'CANCELLED')}>
                    Cancel booking
                  </button>
                )}
              </div>
            </div>
          ))}
      </Modal>
    </div>
  );
}

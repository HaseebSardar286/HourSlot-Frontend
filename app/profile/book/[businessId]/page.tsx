'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { BookingRequest, CustomerPackage, PublicBusinessProfile, Service, Staff } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import Stepper from '@/components/Stepper';
import Skeleton from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import styles from './book.module.css';

const STEPS = [
  { id: 'service', label: 'Service' },
  { id: 'time', label: 'Staff & time' },
  { id: 'notes', label: 'Notes' },
  { id: 'confirm', label: 'Confirm' },
];

function BookWizardContent() {
  const { businessId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [profile, setProfile] = useState<PublicBusinessProfile | null>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'VENUE' | 'ONLINE' | 'PACKAGE'>('VENUE');
  const [eligiblePackages, setEligiblePackages] = useState<CustomerPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);

  const [weekStartDate, setWeekStartDate] = useState<Date>(new Date());
  const [weekDays, setWeekDays] = useState<{ dayNum: number; dateStr: string; label: string; dateObj: Date }[]>([]);

  const loadProfile = async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<PublicBusinessProfile>(`/api/discover/business/${businessId}`, {
        skipAuth: true,
      });
      setProfile(data);

      if (data.branches.length > 0) {
        setSelectedBranchId(data.branches[0].id.toString());
      }

      const branchParam = searchParams.get('branchId');
      const serviceParam = searchParams.get('serviceId');

      if (branchParam && data.branches.some((b) => b.id.toString() === branchParam)) {
        setSelectedBranchId(branchParam);
      }
      if (serviceParam && data.services.some((s) => s.id.toString() === serviceParam)) {
        setSelectedServiceId(serviceParam);
        setStep(2);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load booking configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  useEffect(() => {
    const days = [];
    const start = new Date(weekStartDate);
    for (let i = 0; i < 7; i++) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      days.push({
        dayNum: current.getDate(),
        dateStr: current.toISOString().split('T')[0],
        label: current.toLocaleDateString(undefined, { weekday: 'short' }),
        dateObj: current,
      });
    }
    setWeekDays(days);
    if (!selectedDate && days.length > 0) {
      setSelectedDate(days[0].dateStr);
    }
  }, [weekStartDate, selectedDate]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedBranchId || !selectedServiceId || !selectedDate) {
        setAvailableSlots([]);
        return;
      }
      setSlotsLoading(true);
      setSelectedSlot('');
      try {
        let url = `/api/public/branches/${selectedBranchId}/slots?serviceId=${selectedServiceId}&date=${selectedDate}`;
        if (selectedStaffId) url += `&staffId=${selectedStaffId}`;
        const slots = await apiFetch<string[]>(url, { skipAuth: true });
        setAvailableSlots(slots || []);
      } catch (err: any) {
        setAvailableSlots([]);
        setError(err?.message || 'Could not load available slots.');
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [selectedBranchId, selectedServiceId, selectedStaffId, selectedDate]);

  useEffect(() => {
    const loadEligible = async () => {
      if (!selectedServiceId || step < 4) {
        setEligiblePackages([]);
        return;
      }
      try {
        const data = await apiFetch<CustomerPackage[]>(
          `/api/customer/packages/eligible?serviceId=${selectedServiceId}`
        );
        setEligiblePackages(data || []);
      } catch {
        setEligiblePackages([]);
      }
    };
    loadEligible();
  }, [selectedServiceId, step]);

  const handleNextWeek = () => {
    setWeekStartDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
  };

  const handlePrevWeek = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const prevWeek = new Date(weekStartDate);
    prevWeek.setDate(weekStartDate.getDate() - 7);
    if (prevWeek >= today || today.getTime() - prevWeek.getTime() < 7 * 24 * 60 * 60 * 1000) {
      setWeekStartDate(prevWeek);
    }
  };

  const handleNextStep = () => {
    setError(null);
    if (step === 1 && !selectedServiceId) {
      setError('Please select a service before continuing.');
      return;
    }
    if (step === 2 && (!selectedDate || !selectedSlot)) {
      setError('Please select both a date and a time slot.');
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setError(null);
    setStep((prev) => prev - 1);
  };

  const handleConfirmBooking = async () => {
    if (!selectedBranchId || !selectedServiceId || !selectedDate || !selectedSlot) return;
    if (paymentMethod === 'PACKAGE' && !selectedPackageId) {
      setError('Select a package to redeem, or choose another payment method.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const bookingTime = `${selectedDate}T${selectedSlot}:00`;
    const payload: BookingRequest = {
      branchId: parseInt(selectedBranchId, 10),
      serviceId: parseInt(selectedServiceId, 10),
      staffId: selectedStaffId ? parseInt(selectedStaffId, 10) : null,
      bookingTime,
      clientNotes: clientNotes || null,
      paymentMethod: paymentMethod === 'PACKAGE' ? 'VENUE' : paymentMethod,
      customerPackageId: paymentMethod === 'PACKAGE' ? selectedPackageId : null,
    };

    try {
      const created = await apiFetch<{ id: number }>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          branchId: payload.branchId,
          serviceId: payload.serviceId,
          staffId: payload.staffId,
          bookingTime: payload.bookingTime,
          clientNotes: payload.clientNotes,
          customerPackageId: payload.customerPackageId,
        }),
      });

      if (paymentMethod === 'ONLINE' && created?.id) {
        const checkout = await apiFetch<{ url: string }>(
          `/api/payments/checkout?bookingId=${created.id}`,
          { method: 'POST' }
        );
        if (checkout?.url) {
          window.location.href = checkout.url;
          return;
        }
        setSuccessMessage('Booking created. Online checkout could not start — you can pay from My bookings.');
      } else if (paymentMethod === 'PACKAGE') {
        setSuccessMessage('Appointment booked using your package session.');
      } else {
        setSuccessMessage('Appointment scheduled. Pay at the venue.');
      }

      setSuccess(true);
      setTimeout(() => router.push('/profile/bookings'), 1800);
    } catch (err: any) {
      setError(err?.message || 'Booking failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className={styles.wizardContainer}>
        <Skeleton variant="title" />
        <Skeleton variant="card" height={80} />
        <div className={styles.wizardGrid} style={{ marginTop: 24 }}>
          <Skeleton variant="card" height={320} />
          <Skeleton variant="card" height={240} />
        </div>
      </div>
    );
  }

  if (!profile && error) {
    return (
      <div className={styles.wizardContainer}>
        <EmptyState
          icon="fa-calendar-xmark"
          title="Unable to load booking"
          description={error}
          actionLabel="Back to explore"
          onAction={() => router.push('/profile/explore')}
        />
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.successWrapper}>
        <div className={`surface ${styles.successCard}`}>
          <div className={styles.successIcon}>
            <i className="fa-solid fa-circle-check" />
          </div>
          <h3>Appointment scheduled</h3>
          <p>{successMessage} Redirecting to your bookings…</p>
        </div>
      </div>
    );
  }

  const serviceObj = profile?.services.find((s) => s.id.toString() === selectedServiceId) as Service | undefined;
  const staffObj = profile?.staff.find((s) => s.id.toString() === selectedStaffId) as Staff | undefined;
  const branchStaff = (profile?.staff || []).filter(
    (s) => !selectedBranchId || s.branch?.id?.toString() === selectedBranchId
  );

  const morningSlots = availableSlots.filter((s) => parseInt(s.split(':')[0], 10) < 12);
  const afternoonSlots = availableSlots.filter((s) => parseInt(s.split(':')[0], 10) >= 12);

  const formatFriendlyDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatFriendlyTime = (timeStr: string) => {
    if (!timeStr) return '';
    const h = parseInt(timeStr.split(':')[0], 10);
    const m = timeStr.split(':')[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m} ${ampm}`;
  };

  const contactName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const displayTotal =
    paymentMethod === 'PACKAGE' ? 0 : serviceObj ? serviceObj.price : 0;

  return (
    <div className={styles.wizardContainer}>
      <div className={styles.wizardHeader}>
        <PageHeader
          title="Book appointment"
          subtitle={profile?.business.name ? `at ${profile.business.name}` : undefined}
        />
        <Stepper steps={STEPS} current={step - 1} />
      </div>

      {error && (
        <div className="error-alert" style={{ marginBottom: 20 }}>
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      <div className={styles.wizardGrid}>
        <div className={styles.leftColumn}>
          {step === 1 && (
            <div className={`surface ${styles.panel}`}>
              <h3>Select service</h3>
              {profile?.branches && profile.branches.length > 1 && (
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label" htmlFor="branchSelect">
                    Branch
                  </label>
                  <select
                    id="branchSelect"
                    className="select-field"
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                  >
                    {profile.branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className={styles.catalogList} role="listbox" aria-label="Services">
                {profile?.services.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    className={`${styles.catalogRow} ${selectedServiceId === s.id.toString() ? styles.selectedRow : ''}`}
                    onClick={() => setSelectedServiceId(s.id.toString())}
                    aria-selected={selectedServiceId === s.id.toString()}
                  >
                    <div className={styles.rowRadio}>
                      <div className={selectedServiceId === s.id.toString() ? styles.radioFill : ''} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h5>{s.name}</h5>
                      <span className={styles.duration}>
                        <i className="fa-regular fa-clock" /> {s.durationMinutes} min
                      </span>
                    </div>
                    <span className={styles.price}>${s.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <>
              <div className={`surface ${styles.panel}`}>
                <h3>Select provider</h3>
                <div className={styles.providerGrid}>
                  <button
                    type="button"
                    className={`${styles.providerCard} ${selectedStaffId === '' ? styles.providerSelected : ''}`}
                    onClick={() => setSelectedStaffId('')}
                  >
                    <div className={styles.avatarAnyStaff}>
                      <i className="fa-solid fa-user-group" />
                    </div>
                    <span>Any staff</span>
                  </button>
                  {branchStaff.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      className={`${styles.providerCard} ${selectedStaffId === s.id.toString() ? styles.providerSelected : ''}`}
                      onClick={() => setSelectedStaffId(s.id.toString())}
                    >
                      <div className={styles.avatarAnyStaff}>{s.name.slice(0, 1)}</div>
                      <span>{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={`surface ${styles.panel}`}>
                <div className={styles.calendarStripHeader}>
                  <h3>
                    {weekDays.length > 0 &&
                      weekDays[0].dateObj.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className={styles.calendarArrows}>
                    <button type="button" onClick={handlePrevWeek} aria-label="Previous week">
                      <i className="fa-solid fa-chevron-left" />
                    </button>
                    <button type="button" onClick={handleNextWeek} aria-label="Next week">
                      <i className="fa-solid fa-chevron-right" />
                    </button>
                  </div>
                </div>
                <div className={styles.dateStrip}>
                  {weekDays.map((d) => (
                    <button
                      type="button"
                      key={d.dateStr}
                      className={`${styles.dateCell} ${selectedDate === d.dateStr ? styles.dateCellActive : ''}`}
                      onClick={() => setSelectedDate(d.dateStr)}
                    >
                      <span className={styles.dateCellLabel}>{d.label}</span>
                      <span className={styles.dateCellNum}>{d.dayNum}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={`surface ${styles.panel}`}>
                <h3>Available times · {selectedDate && formatFriendlyDate(selectedDate)}</h3>
                {slotsLoading ? (
                  <Skeleton variant="row" count={3} />
                ) : availableSlots.length === 0 ? (
                  <p className={styles.noSlotsText}>No open slots for this date. Try another day or provider.</p>
                ) : (
                  <div>
                    {morningSlots.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <span className={styles.timeOfDayLabel}>Morning</span>
                        <div className={styles.slotsSubGrid}>
                          {morningSlots.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              className={`${styles.slotButton} ${selectedSlot === slot ? styles.slotBtnSelected : ''}`}
                              onClick={() => setSelectedSlot(slot)}
                            >
                              {formatFriendlyTime(slot)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {afternoonSlots.length > 0 && (
                      <div>
                        <span className={styles.timeOfDayLabel}>Afternoon</span>
                        <div className={styles.slotsSubGrid}>
                          {afternoonSlots.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              className={`${styles.slotButton} ${selectedSlot === slot ? styles.slotBtnSelected : ''}`}
                              onClick={() => setSelectedSlot(slot)}
                            >
                              {formatFriendlyTime(slot)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <div className={`surface ${styles.panel}`}>
              <h3>Booking notes</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 14, fontSize: '0.9rem' }}>
                Contact details come from your HourSlot profile ({contactName || user?.email}).
              </p>
              <div className="form-group">
                <label className="form-label" htmlFor="custBookNotes">
                  Notes for the specialist (optional)
                </label>
                <textarea
                  id="custBookNotes"
                  className="input-field"
                  style={{ minHeight: 100, resize: 'vertical' }}
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Allergies, preferences, or special requests…"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className={`surface ${styles.panel}`}>
              <h3>Confirm & pay</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16 }}>
                Review your details, then choose how you&apos;d like to pay.
              </p>
              <div className={styles.payOptions}>
                <button
                  type="button"
                  className={`${styles.payOption} ${paymentMethod === 'VENUE' ? styles.payOptionSelected : ''}`}
                  onClick={() => {
                    setPaymentMethod('VENUE');
                    setSelectedPackageId(null);
                  }}
                >
                  <div className={styles.payOptionIcon}>
                    <i className="fa-solid fa-store" />
                  </div>
                  <div>
                    <h6>Pay at venue</h6>
                    <p>No card charge now. Pay when you arrive.</p>
                  </div>
                </button>
                <button
                  type="button"
                  className={`${styles.payOption} ${paymentMethod === 'ONLINE' ? styles.payOptionSelected : ''}`}
                  onClick={() => {
                    setPaymentMethod('ONLINE');
                    setSelectedPackageId(null);
                  }}
                >
                  <div className={styles.payOptionIcon}>
                    <i className="fa-solid fa-credit-card" />
                  </div>
                  <div>
                    <h6>Pay online</h6>
                    <p>Secure checkout after you confirm this booking.</p>
                  </div>
                </button>
                {eligiblePackages.length > 0 && (
                  <button
                    type="button"
                    className={`${styles.payOption} ${paymentMethod === 'PACKAGE' ? styles.payOptionSelected : ''}`}
                    onClick={() => setPaymentMethod('PACKAGE')}
                  >
                    <div className={styles.payOptionIcon}>
                      <i className="fa-solid fa-gift" />
                    </div>
                    <div>
                      <h6>Use package session</h6>
                      <p>Redeem a session from a purchased package.</p>
                    </div>
                  </button>
                )}
              </div>

              {paymentMethod === 'PACKAGE' && (
                <div className={styles.packageList}>
                  {eligiblePackages.map((cp) => (
                    <button
                      key={cp.id}
                      type="button"
                      className={`${styles.packageChip} ${selectedPackageId === cp.id ? styles.packageChipSelected : ''}`}
                      onClick={() => setSelectedPackageId(cp.id)}
                    >
                      <strong>{cp.servicePackage.name}</strong>
                      <span>
                        {cp.sessionsRemaining} left
                        {cp.expiresAt
                          ? ` · expires ${new Date(cp.expiresAt).toLocaleDateString()}`
                          : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.rightColumn}>
          <div className={`surface ${styles.summaryCard}`}>
            <h3>Booking summary</h3>
            {serviceObj ? (
              <div className={styles.summaryContent}>
                <div className={styles.summaryServiceRow}>
                  <div>
                    <h5>{serviceObj.name}</h5>
                    <p>at {profile?.business.name}</p>
                  </div>
                  <span className={styles.summaryPrice}>${serviceObj.price.toFixed(2)}</span>
                </div>

                {selectedDate && selectedSlot ? (
                  <div className={styles.summarySlotWidget}>
                    <div className={styles.summarySlotItem}>
                      <i className="fa-regular fa-calendar" />
                      <span>{formatFriendlyDate(selectedDate)}</span>
                    </div>
                    <div className={styles.summarySlotItem}>
                      <i className="fa-regular fa-clock" />
                      <span>
                        {formatFriendlyTime(selectedSlot)} ({serviceObj.durationMinutes} min)
                      </span>
                    </div>
                    <div className={styles.summarySlotItem}>
                      <i className="fa-regular fa-user" />
                      <span>Specialist: {staffObj?.name || 'Any staff'}</span>
                    </div>
                  </div>
                ) : (
                  <p className={styles.summaryEmptyHint}>Choose provider and timeslot to schedule.</p>
                )}

                <div className={styles.summaryTotalRow}>
                  <span>Estimated total</span>
                  <strong>
                    {paymentMethod === 'PACKAGE' ? 'Package' : `$${displayTotal.toFixed(2)}`}
                  </strong>
                </div>
                <p className={styles.policyText}>
                  <i className="fa-solid fa-circle-info" /> Final price may include peak-time adjustments.
                </p>

                <div className={styles.summaryActions}>
                  {step > 1 && (
                    <button type="button" className="btn btn-outline" onClick={handlePrevStep} style={{ flex: 1 }}>
                      Back
                    </button>
                  )}
                  {step < 4 ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleNextStep}
                      style={{ flex: 2 }}
                      disabled={step === 2 && (!selectedDate || !selectedSlot)}
                    >
                      {step === 1 ? 'Next: Staff & time' : step === 2 ? 'Next: Notes' : 'Next: Confirm'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleConfirmBooking}
                      disabled={submitting}
                      style={{ flex: 2 }}
                    >
                      {submitting
                        ? 'Booking…'
                        : paymentMethod === 'ONLINE'
                          ? 'Confirm & pay'
                          : 'Confirm booking'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.summaryContent}>
                <p className={styles.summaryEmptyHint}>Please select a service first.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookWizardPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.wizardContainer}>
          <Skeleton variant="title" />
          <Skeleton variant="card" height={280} />
        </div>
      }
    >
      <BookWizardContent />
    </Suspense>
  );
}

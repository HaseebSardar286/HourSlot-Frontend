'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { PublicBusinessProfile, Service, Staff } from '@/lib/types';
import styles from './book.module.css';

export default function BookWizardPage() {
  const { businessId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [profile, setProfile] = useState<PublicBusinessProfile | null>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [clientNotes, setClientNotes] = useState('');

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
  }, [businessId]);

  useEffect(() => {
    const days = [];
    const start = new Date(weekStartDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
  }, [weekStartDate]);

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
    setLoading(true);
    setError(null);

    const bookingTime = `${selectedDate}T${selectedSlot}:00`;

    try {
      await apiFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          branchId: parseInt(selectedBranchId, 10),
          serviceId: parseInt(selectedServiceId, 10),
          staffId: selectedStaffId ? parseInt(selectedStaffId, 10) : null,
          bookingTime,
          clientNotes: clientNotes || null,
        }),
      });
      setSuccess(true);
      setTimeout(() => router.push('/profile/bookings'), 1800);
    } catch (err: any) {
      setError(err?.message || 'Booking failed.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && step === 1 && !profile) {
    return (
      <div className={styles.loaderContainer}>
        <div className="spinner" />
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.successWrapper}>
        <div className="glass-card text-center" style={{ padding: '60px 40px', maxWidth: '500px' }}>
          <div style={{ fontSize: '3rem', color: '#10b981', marginBottom: '20px' }} aria-hidden>
            <i className="fa-solid fa-circle-check" />
          </div>
          <h3>Appointment scheduled</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Pay at the venue. Redirecting to your appointments…
          </p>
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

  return (
    <div className={styles.wizardContainer}>
      <div className={styles.wizardHeader}>
        <h2>Book Appointment</h2>
        <div className={styles.stepsStepper}>
          {[
            ['1', 'Service'],
            ['2', 'Staff & Time'],
            ['3', 'Notes'],
            ['4', 'Confirm'],
          ].map(([n, label], idx) => (
            <div key={label} style={{ display: 'contents' }}>
              {idx > 0 && (
                <div className={`${styles.stepLine} ${step >= idx + 1 ? styles.stepLineActive : ''}`} />
              )}
              <div className={styles.stepBlock}>
                <div
                  className={`${styles.stepCircle} ${
                    step > idx + 1 ? styles.stepChecked : step === idx + 1 ? styles.stepCurrent : ''
                  }`}
                >
                  {step > idx + 1 ? <i className="fa-solid fa-check" /> : n}
                </div>
                <span>{label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="error-alert" style={{ marginBottom: '24px' }}>
          <i className="fa-solid fa-triangle-exclamation"></i> {error}
        </div>
      )}

      <div className={styles.wizardGrid}>
        <div className={styles.leftColumn}>
          {step === 1 && (
            <div className={styles.glassCardPanel}>
              <h3>Select Service</h3>
              {profile?.branches && profile.branches.length > 1 && (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" htmlFor="branchSelect">Branch</label>
                  <select
                    id="branchSelect"
                    className="input-field"
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                  >
                    {profile.branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
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
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <h5>{s.name}</h5>
                      <span className={styles.duration}>
                        <i className="fa-regular fa-clock"></i> {s.durationMinutes} min
                      </span>
                    </div>
                    <span className={styles.price}>${s.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className={styles.glassCardPanel}>
                <h3>Select Provider</h3>
                <div className={styles.providerGrid}>
                  <button
                    type="button"
                    className={`${styles.providerCard} ${selectedStaffId === '' ? styles.providerSelected : ''}`}
                    onClick={() => setSelectedStaffId('')}
                  >
                    <div className={styles.avatarWrapper}>
                      <div className={styles.avatarAnyStaff}>
                        <i className="fa-solid fa-user-group"></i>
                      </div>
                    </div>
                    <span>Any Staff</span>
                  </button>
                  {branchStaff.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      className={`${styles.providerCard} ${selectedStaffId === s.id.toString() ? styles.providerSelected : ''}`}
                      onClick={() => setSelectedStaffId(s.id.toString())}
                    >
                      <div className={styles.avatarWrapper}>
                        <div className={styles.avatarAnyStaff}>{s.name.slice(0, 1)}</div>
                      </div>
                      <span>{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.glassCardPanel}>
                <div className={styles.calendarStripHeader}>
                  <h3>
                    {weekDays.length > 0 &&
                      weekDays[0].dateObj.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className={styles.calendarArrows}>
                    <button type="button" onClick={handlePrevWeek} aria-label="Previous week">
                      <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <button type="button" onClick={handleNextWeek} aria-label="Next week">
                      <i className="fa-solid fa-chevron-right"></i>
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

              <div className={styles.glassCardPanel}>
                <h3>Available Times for {selectedDate && formatFriendlyDate(selectedDate)}</h3>
                {slotsLoading ? (
                  <div className={styles.loaderContainer} style={{ height: '80px' }}>
                    <div className="spinner" />
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p className={styles.noSlotsText}>No open slots for this date. Try another day or provider.</p>
                ) : (
                  <div className={styles.slotsBlock}>
                    {morningSlots.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
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
            </div>
          )}

          {step === 3 && (
            <div className={styles.glassCardPanel}>
              <h3>Booking notes</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                Contact details are taken from your HourSlot profile ({contactName || user?.email}).
              </p>
              <div className="form-group">
                <label className="form-label" htmlFor="custBookNotes">Notes for the specialist (optional)</label>
                <textarea
                  id="custBookNotes"
                  className="input-field"
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Allergies, preferences, or special requests..."
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className={styles.glassCardPanel}>
              <h3>Confirm booking</h3>
              <p style={{ color: '#64748b', fontSize: '0.92rem', marginBottom: '20px' }}>
                Review your details, then confirm. Payment is collected at the venue — no card charge now.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <i className="fa-solid fa-store" style={{ color: '#10b981', fontSize: '1.4rem' }}></i>
                <div>
                  <h6 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Pay at venue</h6>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                    Free cancellation up to 24 hours before your appointment.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.summaryCard}>
            <h3>Booking Summary</h3>
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
                      <i className="fa-regular fa-calendar"></i>
                      <span>{formatFriendlyDate(selectedDate)}</span>
                    </div>
                    <div className={styles.summarySlotItem}>
                      <i className="fa-regular fa-clock"></i>
                      <span>
                        {formatFriendlyTime(selectedSlot)} ({serviceObj.durationMinutes} min)
                      </span>
                    </div>
                    <div className={styles.summarySlotItem}>
                      <i className="fa-regular fa-user"></i>
                      <span>Specialist: {staffObj?.name || 'Any Staff'}</span>
                    </div>
                  </div>
                ) : (
                  <p className={styles.summaryEmptyHint}>Choose provider and timeslot to schedule.</p>
                )}

                <div className={styles.summaryTotalRow}>
                  <span>Estimated total</span>
                  <strong>${serviceObj.price.toFixed(2)}</strong>
                </div>
                <p className={styles.policyText}>
                  <i className="fa-solid fa-circle-info"></i> Final price may include peak-time adjustments.
                </p>

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  {step > 1 && (
                    <button type="button" className={styles.prevBtn} onClick={handlePrevStep} style={{ flex: 1 }}>
                      Back
                    </button>
                  )}
                  {step < 4 ? (
                    <button
                      type="button"
                      className={styles.nextBtn}
                      onClick={handleNextStep}
                      style={{ flex: 2 }}
                      disabled={step === 2 && (!selectedDate || !selectedSlot)}
                    >
                      {step === 1 ? 'Next: Staff & Time' : step === 2 ? 'Next: Notes' : 'Next: Confirm'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.nextBtn}
                      onClick={handleConfirmBooking}
                      disabled={loading}
                      style={{ flex: 2 }}
                    >
                      {loading ? 'Booking...' : 'Confirm booking'}
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

'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { BookingRequest, CustomerPackage, PublicBusinessProfile, Service, Staff } from '@/lib/types';
import { parseSlots, type AvailableSlot } from '@/lib/slots';
import Skeleton from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import styles from './book.module.css';

const STEPS = [
  { id: 'time', label: 'Time' },
  { id: 'details', label: 'Checkout' },
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
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'VENUE' | 'ONLINE' | 'PACKAGE'>('ONLINE');
  const [eligiblePackages, setEligiblePackages] = useState<CustomerPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);

  const [weekStartDate, setWeekStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [weekDays, setWeekDays] = useState<{ dayNum: number; dateStr: string; label: string; dateObj: Date }[]>([]);

  const toLocalDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const profileHref = `/profile/business/${businessId}`;

  const loadProfile = async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<PublicBusinessProfile>(`/api/discover/business/${businessId}`, {
        skipAuth: true,
      });
      setProfile(data);

      const serviceParam = searchParams.get('serviceId');
      const branchParam = searchParams.get('branchId');
      const staffParam = searchParams.get('staffId');
      const dateParam = searchParams.get('date');
      const slotParam = searchParams.get('slot');

      const validService =
        serviceParam && data.services.some((s) => s.id.toString() === serviceParam) ? serviceParam : null;

      if (!validService) {
        router.replace(profileHref);
        return;
      }

      setSelectedServiceId(validService);

      if (data.branches.length > 0) setSelectedBranchId(data.branches[0].id.toString());
      if (branchParam && data.branches.some((b) => b.id.toString() === branchParam)) {
        setSelectedBranchId(branchParam);
      }
      if (staffParam && data.staff.some((s) => s.id.toString() === staffParam)) {
        setSelectedStaffId(staffParam);
      }
      if (dateParam) setSelectedDate(dateParam);
      if (slotParam) setSelectedSlot(slotParam);
      if (dateParam && slotParam) setStep(2);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to load booking configurations.');
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
    for (let i = 0; i < 5; i++) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      days.push({
        dayNum: current.getDate(),
        dateStr: toLocalDateStr(current),
        label: current.toLocaleDateString(undefined, { weekday: 'short' }),
        dateObj: current,
      });
    }
    setWeekDays(days);
    if (!selectedDate && days.length > 0) setSelectedDate(days[0].dateStr);
  }, [weekStartDate, selectedDate]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedBranchId || !selectedServiceId || !selectedDate) {
        setAvailableSlots([]);
        return;
      }
      setSlotsLoading(true);
      try {
        let url = `/api/public/branches/${selectedBranchId}/slots?serviceId=${selectedServiceId}&date=${selectedDate}`;
        if (selectedStaffId) url += `&staffId=${selectedStaffId}`;
        const slots = await apiFetch<unknown>(url, { skipAuth: true });
        setAvailableSlots(parseSlots(slots));
      } catch (err: unknown) {
        const e = err as { message?: string };
        setAvailableSlots([]);
        setError(e?.message || 'Could not load available slots.');
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [selectedBranchId, selectedServiceId, selectedStaffId, selectedDate]);

  useEffect(() => {
    const loadEligible = async () => {
      if (!selectedServiceId || step < 2) {
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
      next.setDate(prev.getDate() + 5);
      return next;
    });
  };

  const handlePrevWeek = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const prevWeek = new Date(weekStartDate);
    prevWeek.setDate(weekStartDate.getDate() - 5);
    setWeekStartDate(prevWeek < today ? today : prevWeek);
  };

  const handleNextStep = () => {
    setError(null);
    if (step === 1 && (!selectedDate || !selectedSlot)) {
      setError('Please select both a date and a time slot.');
      return;
    }
    setStep(2);
  };

  const handlePrevStep = () => {
    setError(null);
    if (step === 2) {
      setStep(1);
      return;
    }
    router.push(profileHref);
  };

  const handleConfirmBooking = async () => {
    if (!selectedBranchId || !selectedServiceId || !selectedDate || !selectedSlot) return;
    if (!termsAccepted) {
      setError('Please agree to the terms and cancellation policy.');
      return;
    }
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
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Booking failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatFriendlyDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
      month: 'short',
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

  if (loading && !profile) {
    return (
      <div className={styles.wizard}>
        <Skeleton variant="title" />
        <Skeleton variant="card" height={320} />
      </div>
    );
  }

  if (!profile && error) {
    return (
      <div className={styles.wizard}>
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

  if (!profile || !selectedServiceId) {
    return (
      <div className={styles.wizard}>
        <Skeleton variant="title" />
        <Skeleton variant="card" height={280} />
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.successWrap}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>
            <i className="fa-solid fa-circle-check" />
          </div>
          <h3>Appointment scheduled</h3>
          <p>{successMessage} Redirecting to your bookings…</p>
        </div>
      </div>
    );
  }

  const serviceObj = profile.services.find((s) => s.id.toString() === selectedServiceId) as Service | undefined;
  const staffObj = profile.staff.find((s) => s.id.toString() === selectedStaffId) as Staff | undefined;
  const selectedSlotObj = availableSlots.find((slot) => slot.startTime === selectedSlot);
  const quotedPrice =
    selectedSlotObj?.price != null
      ? selectedSlotObj.price
      : serviceObj
        ? serviceObj.price
        : 0;
  const quotedBase =
    selectedSlotObj?.basePrice != null ? selectedSlotObj.basePrice : quotedPrice;
  const pricingKind = selectedSlotObj?.pricingKind;
  const pricingLabel = selectedSlotObj?.pricingLabel;
  const branchStaff = (profile.staff || []).filter(
    (s) => !selectedBranchId || s.branch?.id?.toString() === selectedBranchId
  );
  const gallery = profile.business.galleryUrls
    ?.split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  const thumb = gallery?.[0] || profile.business.logoUrl || null;
  const displayTotal = paymentMethod === 'PACKAGE' ? 0 : quotedPrice;
  const taxEstimate = displayTotal * 0.08;
  const grandTotal = displayTotal + (paymentMethod === 'PACKAGE' ? 0 : taxEstimate);

  const monthLabel =
    weekDays.length > 0
      ? weekDays[0].dateObj.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : '';

  return (
    <div className={styles.wizard}>
      {step === 1 && (
        <header className={styles.head}>
          <div>
            <h1>Select Provider &amp; Time</h1>
            <p>
              {serviceObj
                ? `Scheduling ${serviceObj.name}. Pick your preferred team member and an open time slot.`
                : 'Pick your preferred team member and an open time slot.'}
            </p>
          </div>
          <div className={styles.stepper} aria-label="Progress">
            {STEPS.map((s, i) => {
              const n = i + 1;
              const active = step === n;
              const done = step > n;
              return (
                <div key={s.id} className={styles.stepItem}>
                  <span className={`${styles.stepDot} ${active || done ? styles.stepDotOn : ''}`}>
                    {done ? <i className="fa-solid fa-check" /> : n}
                  </span>
                  <span className={`${styles.stepLabel} ${active ? styles.stepLabelOn : ''}`}>{s.label}</span>
                  {i < STEPS.length - 1 && <span className={`${styles.stepLine} ${done ? styles.stepLineOn : ''}`} />}
                </div>
              );
            })}
          </div>
        </header>
      )}

      {step === 2 && (
        <header className={styles.head}>
          <div>
            <h1>Checkout</h1>
            <p>Review your booking details and select a payment method.</p>
          </div>
        </header>
      )}

      {error && (
        <div className="error-alert" style={{ marginBottom: 18 }}>
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      {step === 1 && (
        <>
          {profile.branches.length > 1 && (
            <div className={styles.branchPick}>
              <label htmlFor="branchSelect">Branch</label>
              <select
                id="branchSelect"
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

          <div className={styles.stepMeta}>
            <span>Step 1 of 2</span>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: '50%' }} />
            </div>
          </div>

          <div className={styles.timeLayout}>
            <section className={styles.providerCol}>
              <h2>Available team</h2>
              <div className={styles.providerList}>
                <button
                  type="button"
                  className={`${styles.providerCard} ${selectedStaffId === '' ? styles.providerOn : ''}`}
                  onClick={() => setSelectedStaffId('')}
                >
                  <div className={styles.providerAvatar}>
                    <i className="fa-solid fa-user-group" />
                  </div>
                  <div>
                    <strong>No preference</strong>
                    <span>First available team member</span>
                  </div>
                  {selectedStaffId === '' && <i className={`fa-solid fa-check ${styles.check}`} />}
                </button>
                {branchStaff.map((s) => {
                  const on = selectedStaffId === s.id.toString();
                  return (
                    <button
                      type="button"
                      key={s.id}
                      className={`${styles.providerCard} ${on ? styles.providerOn : ''}`}
                      onClick={() => setSelectedStaffId(s.id.toString())}
                    >
                      <div className={styles.providerAvatar}>{s.name.charAt(0)}</div>
                      <div>
                        <strong>{s.name}</strong>
                        <span>{s.specialty || s.designation || 'Team member'}</span>
                        {typeof s.rating === 'number' && s.rating > 0 && (
                          <em>
                            <i className="fa-solid fa-star" /> {s.rating.toFixed(1)}
                          </em>
                        )}
                      </div>
                      {on && <i className={`fa-solid fa-check ${styles.check}`} />}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={styles.calendarCard}>
              <div className={styles.calHead}>
                <h2>{monthLabel}</h2>
                <div className={styles.calArrows}>
                  <button type="button" onClick={handlePrevWeek} aria-label="Previous">
                    <i className="fa-solid fa-chevron-left" />
                  </button>
                  <button type="button" onClick={handleNextWeek} aria-label="Next">
                    <i className="fa-solid fa-chevron-right" />
                  </button>
                </div>
              </div>

              <div className={styles.dateStrip}>
                {weekDays.map((d) => (
                  <button
                    type="button"
                    key={d.dateStr}
                    className={`${styles.dateCell} ${selectedDate === d.dateStr ? styles.dateCellOn : ''}`}
                    onClick={() => {
                      setSelectedDate(d.dateStr);
                      setSelectedSlot('');
                    }}
                  >
                    <span>{d.label}</span>
                    <strong>{d.dayNum}</strong>
                  </button>
                ))}
              </div>

              <div className={styles.slotLegend}>
                <span>
                  <i className={styles.legendDot} /> Available
                </span>
                <span>
                  <i className={`${styles.legendDot} ${styles.legendPeak}`} /> Peak
                </span>
                <span>
                  <i className={`${styles.legendDot} ${styles.legendOffPeak}`} /> Off-peak
                </span>
              </div>

              {slotsLoading ? (
                <Skeleton variant="row" count={3} />
              ) : availableSlots.length === 0 ? (
                <p className={styles.noSlots}>No open slots for this date. Try another day or team member — this day may be outside working hours.</p>
              ) : (
                <div className={styles.slotGrid}>
                  {availableSlots.map((slot) => {
                    const kind = slot.pricingKind;
                    return (
                      <button
                        key={slot.startTime}
                        type="button"
                        className={`${styles.slotBtn} ${selectedSlot === slot.startTime ? styles.slotBtnOn : ''} ${
                          kind === 'PEAK' ? styles.slotBtnPeak : kind === 'OFF_PEAK' ? styles.slotBtnOffPeak : ''
                        }`}
                        onClick={() => setSelectedSlot(slot.startTime)}
                      >
                        <span>{formatFriendlyTime(slot.startTime)}</span>
                        {slot.price != null && (
                          <em className={styles.slotPrice}>${slot.price.toFixed(2)}</em>
                        )}
                        {slot.pricingLabel && kind !== 'STANDARD' && (
                          <strong className={styles.slotBadge}>{slot.pricingLabel}</strong>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <div className={styles.footerBar}>
            <Link href={profileHref} className={styles.backLink}>
              Back to services
            </Link>
            <button
              type="button"
              className={`btn btn-primary ${styles.nextBtn}`}
              onClick={handleNextStep}
              disabled={!selectedDate || !selectedSlot}
            >
              Continue to Checkout <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <div className={styles.checkoutGrid}>
          <section className={styles.payPanel}>
            <h2>Payment Options</h2>
            <button
              type="button"
              className={`${styles.payOption} ${paymentMethod === 'ONLINE' ? styles.payOptionOn : ''}`}
              onClick={() => {
                setPaymentMethod('ONLINE');
                setSelectedPackageId(null);
              }}
            >
              <span className={styles.payIcon}>
                <i className="fa-solid fa-credit-card" />
              </span>
              <div>
                <strong>Pay Online (Stripe)</strong>
                <p>Secure credit card payment</p>
              </div>
              <span className={`${styles.radio} ${paymentMethod === 'ONLINE' ? styles.radioOn : ''}`} />
            </button>
            <button
              type="button"
              className={`${styles.payOption} ${paymentMethod === 'VENUE' ? styles.payOptionOn : ''}`}
              onClick={() => {
                setPaymentMethod('VENUE');
                setSelectedPackageId(null);
              }}
            >
              <span className={styles.payIcon}>
                <i className="fa-solid fa-store" />
              </span>
              <div>
                <strong>Pay at Venue</strong>
                <p>Pay via card or cash upon arrival</p>
              </div>
              <span className={`${styles.radio} ${paymentMethod === 'VENUE' ? styles.radioOn : ''}`} />
            </button>
            {eligiblePackages.length > 0 && (
              <button
                type="button"
                className={`${styles.payOption} ${paymentMethod === 'PACKAGE' ? styles.payOptionOn : ''}`}
                onClick={() => setPaymentMethod('PACKAGE')}
              >
                <span className={styles.payIcon}>
                  <i className="fa-solid fa-gift" />
                </span>
                <div>
                  <strong>Use Package Session</strong>
                  <p>Redeem a remaining session</p>
                </div>
                <span className={`${styles.radio} ${paymentMethod === 'PACKAGE' ? styles.radioOn : ''}`} />
              </button>
            )}

            {paymentMethod === 'PACKAGE' && (
              <div className={styles.packageList}>
                {eligiblePackages.map((cp) => (
                  <button
                    key={cp.id}
                    type="button"
                    className={`${styles.packageChip} ${selectedPackageId === cp.id ? styles.packageChipOn : ''}`}
                    onClick={() => setSelectedPackageId(cp.id)}
                  >
                    <strong>{cp.servicePackage.name}</strong>
                    <span>{cp.sessionsRemaining} left</span>
                  </button>
                ))}
              </div>
            )}

            <div className={styles.notesBlock}>
              <label htmlFor="notes">Notes for the business (optional)</label>
              <textarea
                id="notes"
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                placeholder="Preferences, accessibility needs, or other details…"
              />
            </div>
          </section>

          <aside className={styles.summaryCard}>
            <h2>Order Summary</h2>
            {serviceObj && (
              <div className={styles.summaryService}>
                <div className={styles.summaryThumb}>
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" />
                  ) : (
                    <span>{profile.business.name?.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <strong>{serviceObj.name}</strong>
                  <p>
                    <i className="fa-regular fa-clock" /> {serviceObj.durationMinutes} mins
                  </p>
                </div>
              </div>
            )}

            <div className={styles.summaryMeta}>
              <div className={styles.metaBox}>
                <i className="fa-regular fa-calendar" />
                <div>
                  <span>{formatFriendlyDate(selectedDate)}</span>
                  <em>{formatFriendlyTime(selectedSlot)}</em>
                </div>
              </div>
              <div className={styles.metaBox}>
                <i className="fa-regular fa-user" />
                <div>
                  <span>Staff</span>
                  <em>{staffObj?.name || 'Any available'}</em>
                </div>
              </div>
            </div>

            <div className={styles.priceRows}>
              <div>
                <span>Service fee</span>
                <span>
                  {pricingKind && pricingKind !== 'STANDARD' && quotedBase !== quotedPrice ? (
                    <>
                      <s className={styles.wasPrice}>${quotedBase.toFixed(2)}</s> ${displayTotal.toFixed(2)}
                    </>
                  ) : (
                    `$${displayTotal.toFixed(2)}`
                  )}
                </span>
              </div>
              {paymentMethod !== 'PACKAGE' && pricingLabel && pricingKind && pricingKind !== 'STANDARD' && (
                <div className={pricingKind === 'PEAK' ? styles.peakNote : styles.offPeakNote}>
                  <span>{pricingLabel}</span>
                  <span>
                    {quotedPrice >= quotedBase ? '+' : ''}
                    ${(quotedPrice - quotedBase).toFixed(2)}
                  </span>
                </div>
              )}
              {paymentMethod !== 'PACKAGE' && (
                <div>
                  <span>Est. tax (8%)</span>
                  <span>${taxEstimate.toFixed(2)}</span>
                </div>
              )}
              <div className={styles.totalRow}>
                <span>Total</span>
                <strong>{paymentMethod === 'PACKAGE' ? 'Package' : `$${grandTotal.toFixed(2)}`}</strong>
              </div>
            </div>

            <label className={styles.terms}>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <span>I agree to the Terms &amp; Conditions and Cancellation Policy.</span>
            </label>

            <button
              type="button"
              className={`btn btn-primary ${styles.confirmBtn}`}
              onClick={handleConfirmBooking}
              disabled={submitting || !termsAccepted}
            >
              {submitting ? 'Booking…' : 'Confirm Booking'}
              {!submitting && <i className="fa-solid fa-arrow-right" />}
            </button>

            <button type="button" className={styles.backLink} onClick={handlePrevStep} style={{ marginTop: 12 }}>
              Back to schedule
            </button>
            {user && (
              <p className={styles.accountHint}>
                Booking as {user.firstName} {user.lastName}
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

export default function BookWizardPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.wizard}>
          <Skeleton variant="title" />
          <Skeleton variant="card" height={280} />
        </div>
      }
    >
      <BookWizardContent />
    </Suspense>
  );
}

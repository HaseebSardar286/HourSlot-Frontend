'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { PublicBusinessProfile } from '@/lib/types';
import type { AvailableSlot } from '@/lib/slots';
import {
  buildBookingConfirmationHref,
  buildBookingHref,
  clearBookingDraft,
  defaultBookingState,
  loadBookingDraft,
  nextStep,
  parseBookingSearchParams,
  previousStep,
  resolveAllowedStep,
  saveBookingDraft,
  saveConfirmationSnapshot,
  syncBookingUrl,
  validateStep,
  type BookingFlowState,
  type BookingStep,
} from '@/lib/booking-flow';
import BookingShell from '@/components/booking/BookingShell';
import ServiceStep from '@/components/booking/ServiceStep';
import DetailsStep from '@/components/booking/DetailsStep';
import ScheduleStep from '@/components/booking/ScheduleStep';
import ConfirmStep, { type PaymentChoice } from '@/components/booking/ConfirmStep';
import Skeleton from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';

const STEP_COPY: Record<BookingStep, { title: string; lead: string }> = {
  service: {
    title: 'Choose your service',
    lead: 'Pick the service you want to book at this business.',
  },
  details: {
    title: 'Location & specialist',
    lead: 'Select where you will visit and optionally choose a team member.',
  },
  schedule: {
    title: 'Pick date & time',
    lead: 'Choose an open slot that works for you.',
  },
  confirm: {
    title: 'Review & confirm',
    lead: 'Sign in if needed, then confirm your appointment.',
  },
};

function mergeFlowFromParams(
  searchParams: URLSearchParams,
  profile: PublicBusinessProfile
): BookingFlowState {
  const parsed = parseBookingSearchParams(searchParams);
  const branchId =
    parsed.branchId && profile.branches.some((b) => String(b.id) === parsed.branchId)
      ? parsed.branchId
      : profile.branches[0]
        ? String(profile.branches[0].id)
        : '';

  const serviceId =
    parsed.serviceId && profile.services.some((s) => String(s.id) === parsed.serviceId)
      ? parsed.serviceId
      : '';

  const staffId =
    parsed.staffId && profile.staff.some((s) => String(s.id) === parsed.staffId) ? parsed.staffId : '';

  const initial: BookingFlowState = {
    step: parsed.step,
    serviceId,
    branchId,
    staffId,
    date: parsed.date,
    slot: parsed.slot,
    customerPackageId: parsed.customerPackageId || '',
  };
  initial.step = resolveAllowedStep(initial.step, initial);
  return initial;
}

function BookWizardInner() {
  const params = useParams();
  const businessId = Array.isArray(params.businessId) ? params.businessId[0] : params.businessId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  const [profile, setProfile] = useState<PublicBusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [flow, setFlow] = useState<BookingFlowState>(defaultBookingState());
  const [paymentMethod, setPaymentMethod] = useState<PaymentChoice>('ONLINE');
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [clientNotes, setClientNotes] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [quotedSlot, setQuotedSlot] = useState<AvailableSlot | null>(null);
  const [packageLabel, setPackageLabel] = useState<string | null>(null);

  const profileLoaded = useRef(false);
  const pendingUrlSync = useRef(false);
  const urlSyncOptionsRef = useRef<{ replace?: boolean } | undefined>(undefined);
  const profileHref = `/profile/business/${businessId}`;

  const applyFlow = useCallback(
    (patch: Partial<BookingFlowState>, options?: { replace?: boolean }) => {
      urlSyncOptionsRef.current = options;
      pendingUrlSync.current = true;
      setFlow((prev) => {
        const next: BookingFlowState = { ...prev, ...patch };
        next.step = resolveAllowedStep(next.step, next);
        return next;
      });
    },
    []
  );

  useEffect(() => {
    if (!pendingUrlSync.current || !businessId) return;
    pendingUrlSync.current = false;
    syncBookingUrl(router, businessId, flow, urlSyncOptionsRef.current);
  }, [flow, businessId, router]);

  useEffect(() => {
    const load = async () => {
      if (!businessId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<PublicBusinessProfile>(`/api/discover/business/${businessId}`, {
          skipAuth: true,
        });
        setProfile(data);
        profileLoaded.current = true;

        const initial = mergeFlowFromParams(searchParams, data);
        setFlow(initial);
        const canonicalHref = buildBookingHref(businessId, initial);
        const currentPath = `${window.location.pathname}${window.location.search}`;
        if (canonicalHref !== currentPath) {
          router.replace(canonicalHref, { scroll: false });
        }

        const draft = loadBookingDraft(businessId);
        if (draft) {
          if (draft.paymentMethod) setPaymentMethod(draft.paymentMethod);
          if (draft.clientNotes) setClientNotes(draft.clientNotes);
          if (draft.termsAccepted) setTermsAccepted(draft.termsAccepted);
          if (draft.selectedPackageId != null) setSelectedPackageId(draft.selectedPackageId);
        }

        if (initial.customerPackageId) {
          setPaymentMethod('PACKAGE');
          setSelectedPackageId(Number.parseInt(initial.customerPackageId, 10));
          if (isAuthenticated) {
            apiFetch<{ id: number; servicePackage: { name: string } }[]>(`/api/customer/packages`)
              .then((pkgs) => {
                const match = pkgs.find((p) => String(p.id) === initial.customerPackageId);
                if (match) setPackageLabel(match.servicePackage.name);
              })
              .catch(() => {});
          }
        }
      } catch (err: unknown) {
        const e = err as { message?: string };
        setError(e?.message || 'Failed to load booking.');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  useEffect(() => {
    if (!profile || !profileLoaded.current) return;
    const next = mergeFlowFromParams(searchParams, profile);
    setFlow((prev) => {
      if (
        prev.step === next.step &&
        prev.serviceId === next.serviceId &&
        prev.branchId === next.branchId &&
        prev.staffId === next.staffId &&
        prev.date === next.date &&
        prev.slot === next.slot &&
        prev.customerPackageId === next.customerPackageId
      ) {
        return prev;
      }
      return next;
    });
  }, [searchParams, profile]);

  useEffect(() => {
    if (!businessId) return;
    saveBookingDraft(businessId, {
      paymentMethod,
      clientNotes,
      termsAccepted,
      selectedPackageId,
    });
  }, [businessId, paymentMethod, clientNotes, termsAccepted, selectedPackageId]);

  useEffect(() => {
    const fetchQuoted = async () => {
      if (flow.step !== 'confirm' || !flow.branchId || !flow.serviceId || !flow.date || !flow.slot) {
        if (flow.step !== 'confirm') return;
        setQuotedSlot(null);
        return;
      }
      try {
        let url = `/api/public/branches/${flow.branchId}/slots?serviceId=${flow.serviceId}&date=${flow.date}`;
        if (flow.staffId) url += `&staffId=${flow.staffId}`;
        const slots = await apiFetch<unknown>(url, { skipAuth: true });
        const list = Array.isArray(slots)
          ? slots.map((item) =>
              typeof item === 'string' ? { startTime: item.slice(0, 5) } : (item as AvailableSlot)
            )
          : [];
        const match = list.find((s) => s.startTime?.slice(0, 5) === flow.slot);
        setQuotedSlot(match || null);
      } catch {
        setQuotedSlot(null);
      }
    };
    fetchQuoted();
  }, [flow.step, flow.branchId, flow.serviceId, flow.staffId, flow.date, flow.slot]);

  const service = useMemo(
    () => profile?.services.find((s) => String(s.id) === flow.serviceId) || null,
    [profile, flow.serviceId]
  );
  const branch = useMemo(
    () => profile?.branches.find((b) => String(b.id) === flow.branchId) || null,
    [profile, flow.branchId]
  );
  const staff = useMemo(
    () => profile?.staff.find((s) => String(s.id) === flow.staffId) || null,
    [profile, flow.staffId]
  );

  const gallery = profile?.business.galleryUrls
    ?.split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  const thumb = gallery?.[0] || profile?.business.logoUrl || null;

  const quotedPrice = quotedSlot?.price ?? service?.price ?? 0;
  const returnUrl = buildBookingHref(businessId as string, { ...flow, step: 'confirm' });

  const handleBack = () => {
    setError(null);
    const prev = previousStep(flow.step);
    if (prev) {
      applyFlow({ step: prev });
      return;
    }
    router.push(profileHref);
  };

  const handleContinue = () => {
    setError(null);
    const validation = validateStep(flow.step, flow);
    if (!validation.valid) {
      setError(validation.message || 'Please complete this step.');
      return;
    }
    const nxt = nextStep(flow.step);
    if (nxt) applyFlow({ step: nxt });
  };

  const handleConfirm = async () => {
    if (!profile || !flow.branchId || !flow.serviceId || !flow.date || !flow.slot) return;
    if (!isAuthenticated) return;
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

    const bookingTime = `${flow.date}T${flow.slot}:00`;

    try {
      const created = await apiFetch<{ id: number }>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          branchId: Number.parseInt(flow.branchId, 10),
          serviceId: Number.parseInt(flow.serviceId, 10),
          staffId: flow.staffId ? Number.parseInt(flow.staffId, 10) : null,
          bookingTime,
          clientNotes: clientNotes || null,
          customerPackageId: paymentMethod === 'PACKAGE' ? selectedPackageId : null,
        }),
      });

      saveConfirmationSnapshot({
        bookingId: created.id,
        businessId: Number(businessId),
        businessName: profile.business.name,
        serviceName: service?.name || '',
        branchName: branch?.name || '',
        branchAddress: branch?.address,
        staffName: staff?.name,
        bookingTime,
        price: quotedPrice,
        currency: quotedSlot?.currency || service?.currency || profile.business.currency,
        paymentMethod,
        durationMinutes: service?.durationMinutes,
      });

      clearBookingDraft(businessId as string);

      if (paymentMethod === 'ONLINE' && created?.id) {
        const checkout = await apiFetch<{ url: string }>(
          `/api/payments/checkout?bookingId=${created.id}`,
          { method: 'POST' }
        );
        if (checkout?.url) {
          window.location.href = checkout.url;
          return;
        }
      }

      router.push(buildBookingConfirmationHref(businessId as string, created.id, paymentMethod));
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ width: '100%', padding: '24px 8px' }}>
        <Skeleton variant="title" />
        <Skeleton variant="card" height={360} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ width: '100%', padding: '24px 8px' }}>
        <EmptyState
          icon="fa-calendar-xmark"
          title="Unable to start booking"
          description={error || 'Business not found.'}
          actionLabel="Back to explore"
          onAction={() => router.push('/profile/explore')}
        />
      </div>
    );
  }

  if (profile.services.length === 0) {
    return (
      <div style={{ width: '100%', padding: '24px 8px' }}>
        <EmptyState
          icon="fa-scissors"
          title="No bookable services"
          description="This business has not published services yet."
          actionLabel="Back to profile"
          onAction={() => router.push(profileHref)}
        />
      </div>
    );
  }

  const copy = STEP_COPY[flow.step];
  const isConfirm = flow.step === 'confirm';

  return (
    <BookingShell
      businessId={businessId as string}
      businessName={profile.business.name}
      businessThumb={thumb}
      currentStep={flow.step}
      stepTitle={copy.title}
      stepLead={copy.lead}
      flow={flow}
      service={service}
      branch={branch}
      staff={staff}
      date={flow.date}
      slot={flow.slot}
      price={quotedPrice}
      currency={quotedSlot?.currency || service?.currency || profile.business.currency}
      customerPackageLabel={packageLabel}
      onBack={handleBack}
      onContinue={isConfirm ? undefined : handleContinue}
      continueLabel={flow.step === 'schedule' ? 'Review booking' : 'Continue'}
      continueDisabled={!validateStep(flow.step, flow).valid}
      showFooter={!isConfirm}
      showGuestNote={!isAuthenticated}
    >
      {error && (
        <div className="error-alert" style={{ marginBottom: 16 }}>
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      {flow.step === 'service' && (
        <ServiceStep
          services={profile.services}
          selectedServiceId={flow.serviceId}
          currency={profile.business.currency}
          onSelect={(serviceId) =>
            applyFlow({
              serviceId,
              staffId: '',
              date: '',
              slot: '',
              step: 'service',
            })
          }
        />
      )}

      {flow.step === 'details' && (
        <DetailsStep
          branches={profile.branches}
          staff={profile.staff}
          selectedBranchId={flow.branchId}
          selectedStaffId={flow.staffId}
          onBranchChange={(branchId) =>
            applyFlow({ branchId, date: '', slot: '', step: 'details' })
          }
          onStaffChange={(staffId) => applyFlow({ staffId, date: '', slot: '', step: 'details' })}
        />
      )}

      {flow.step === 'schedule' && (
        <ScheduleStep
          branchId={flow.branchId}
          serviceId={flow.serviceId}
          staffId={flow.staffId}
          selectedDate={flow.date}
          selectedSlot={flow.slot}
          currency={quotedSlot?.currency || service?.currency || profile.business.currency}
          onDateChange={(date) => applyFlow({ date, slot: '', step: 'schedule' })}
          onSlotChange={(slot, quoted) => {
            applyFlow({ slot, step: 'schedule' });
            setQuotedSlot(quoted || null);
          }}
        />
      )}

      {flow.step === 'confirm' && (
        <ConfirmStep
          isAuthenticated={isAuthenticated}
          returnUrl={returnUrl}
          serviceId={flow.serviceId}
          paymentMethod={paymentMethod}
          selectedPackageId={selectedPackageId}
          clientNotes={clientNotes}
          termsAccepted={termsAccepted}
          submitting={submitting}
          onPaymentChange={setPaymentMethod}
          onPackageSelect={setSelectedPackageId}
          onNotesChange={setClientNotes}
          onTermsChange={setTermsAccepted}
          onConfirm={handleConfirm}
        />
      )}
    </BookingShell>
  );
}

export default function BookWizardPage() {
  return (
    <Suspense
      fallback={
        <div style={{ width: '100%', padding: '24px 8px' }}>
          <Skeleton variant="title" />
          <Skeleton variant="card" height={360} />
        </div>
      }
    >
      <BookWizardInner />
    </Suspense>
  );
}

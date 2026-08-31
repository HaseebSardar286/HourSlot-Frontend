'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { parseSlots, type AvailableSlot } from '@/lib/slots';
import { buildWeekDays, formatFriendlyTime, startOfWeekMonday, toLocalDateStr } from '@/lib/booking-flow';
import { formatMoney } from '@/lib/money';
import Skeleton from '@/components/Skeleton';
import styles from './booking.module.css';

interface ScheduleStepProps {
  branchId: string;
  serviceId: string;
  staffId: string;
  selectedDate: string;
  selectedSlot: string;
  currency?: string;
  onDateChange: (date: string) => void;
  onSlotChange: (slot: string, quoted?: AvailableSlot) => void;
  compact?: boolean;
}

export default function ScheduleStep({
  branchId,
  serviceId,
  staffId,
  selectedDate,
  selectedSlot,
  currency,
  onDateChange,
  onSlotChange,
  compact = false,
}: ScheduleStepProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [weekDays, setWeekDays] = useState(() => buildWeekDays(startOfWeekMonday(new Date())));
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  const todayStr = toLocalDateStr(new Date());

  useEffect(() => {
    setWeekDays(buildWeekDays(weekStart));
  }, [weekStart]);

  useEffect(() => {
    if (selectedDate || weekDays.length === 0) return;
    const firstFuture = weekDays.find((d) => d.dateStr >= todayStr);
    if (firstFuture) onDateChange(firstFuture.dateStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDays, selectedDate, todayStr]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!branchId || !serviceId || !selectedDate) {
        setAvailableSlots([]);
        return;
      }
      setSlotsLoading(true);
      setSlotError(null);
      try {
        let url = `/api/public/branches/${branchId}/slots?serviceId=${serviceId}&date=${selectedDate}`;
        if (staffId) url += `&staffId=${staffId}`;
        const slots = await apiFetch<unknown>(url, { skipAuth: true });
        setAvailableSlots(parseSlots(slots));
      } catch (err: unknown) {
        const e = err as { message?: string };
        setAvailableSlots([]);
        setSlotError(e?.message || 'Could not load available slots.');
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [branchId, serviceId, staffId, selectedDate]);

  const money = (amount: number, code?: string) => formatMoney(amount, code || currency);

  const monthLabel =
    weekDays.length > 0
      ? weekDays[0].dateObj.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : '';

  const handlePrevWeek = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    const prevMonday = startOfWeekMonday(prev);
    setWeekStart(prevMonday < today ? today : prevMonday);
  };

  const handleNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
  };

  return (
    <div className={compact ? styles.compactMode : undefined}>
      <div className={styles.calendarCard}>
        <div className={styles.calHead}>
          <h3>{monthLabel}</h3>
          <div className={styles.calArrows}>
            <button type="button" onClick={handlePrevWeek} aria-label="Previous week">
              <i className="fa-solid fa-chevron-left" />
            </button>
            <button type="button" onClick={handleNextWeek} aria-label="Next week">
              <i className="fa-solid fa-chevron-right" />
            </button>
          </div>
        </div>

        <div className={styles.dateStrip}>
          {weekDays.map((d) => {
            const isPast = d.dateStr < todayStr;
            const on = selectedDate === d.dateStr;
            return (
              <button
                key={d.dateStr}
                type="button"
                disabled={isPast}
                className={`${styles.dateCell} ${on ? styles.dateCellOn : ''} ${isPast ? styles.dateCellPast : ''}`}
                onClick={() => {
                  if (isPast) return;
                  onDateChange(d.dateStr);
                  onSlotChange('');
                }}
              >
                <span>{d.label}</span>
                <strong>{d.dayNum}</strong>
              </button>
            );
          })}
        </div>

        <div className={styles.slotLegend}>
          <span>
            <i className={styles.legendDot} /> Standard
          </span>
          <span>
            <i className={`${styles.legendDot} ${styles.legendPeak}`} /> Peak
          </span>
          <span>
            <i className={`${styles.legendDot} ${styles.legendOffPeak}`} /> Off-peak
          </span>
        </div>

        {slotError && (
          <p className={styles.noSlots} style={{ color: 'var(--accent-red)', marginBottom: 12 }}>
            {slotError}
          </p>
        )}

        {slotsLoading ? (
          <Skeleton variant="row" count={3} />
        ) : availableSlots.length === 0 ? (
          <p className={styles.noSlots}>
            No open slots for this date. Try another day or a different specialist.
          </p>
        ) : (
          <div className={styles.slotGrid}>
            {availableSlots.map((slot) => {
              const kind = slot.pricingKind;
              const on = selectedSlot === slot.startTime;
              return (
                <button
                  key={slot.startTime}
                  type="button"
                  className={`${styles.slotBtn} ${on ? styles.slotBtnOn : ''} ${
                    kind === 'PEAK' ? styles.slotBtnPeak : kind === 'OFF_PEAK' ? styles.slotBtnOffPeak : ''
                  }`}
                  onClick={() => onSlotChange(slot.startTime, slot)}
                >
                  <span>{formatFriendlyTime(slot.startTime)}</span>
                  {slot.price != null && <em className={styles.slotPrice}>{money(slot.price, slot.currency)}</em>}
                  {slot.pricingLabel && kind !== 'STANDARD' && (
                    <strong className={styles.slotBadge}>{slot.pricingLabel}</strong>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

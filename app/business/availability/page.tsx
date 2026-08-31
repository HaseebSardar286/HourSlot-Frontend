'use client';

import { useMemo, useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import Modal from '@/components/Modal';
import FilterBar from '@/components/FilterBar';
import ConfirmDialog from '@/components/ConfirmDialog';
import CustomSelect from '@/components/CustomSelect';
import CustomDatePicker from '@/components/CustomDatePicker';
import CustomTimePicker from '@/components/CustomTimePicker';
import styles from './availability.module.css';

interface Branch {
  id: number;
  name: string;
}

interface Staff {
  id: number;
  name: string;
  specialty?: string;
  branch: {
    id: number;
  };
}

interface BreakPeriod {
  id: number;
  startTime: string;
  endTime: string;
}

interface TimeRange {
  startTime: string;
  endTime: string;
}

interface WorkingHour {
  id: number;
  dayOfWeek: number;
  startTime?: string;
  endTime?: string;
  closed: boolean;
  slotStepMinutes?: number;
  intervals?: TimeRange[];
  breaks?: BreakPeriod[];
}

interface Holiday {
  id: number;
  date: string;
  description?: string;
}

interface DayDraft {
  dayOfWeek: number;
  closed: boolean;
  intervals: TimeRange[];
  customStart: string;
  customEnd: string;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

const STEP_OPTIONS = [
  { value: '10', label: '10 mins' },
  { value: '30', label: '30 mins' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
];

function toMinutes(time: string): number {
  const [h, m] = time.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatHm(time?: string): string {
  if (!time) return '';
  return time.slice(0, 5);
}

function overlaps(a: TimeRange, b: TimeRange): boolean {
  return toMinutes(a.startTime) < toMinutes(b.endTime) && toMinutes(a.endTime) > toMinutes(b.startTime);
}

function mergeIntervals(ranges: TimeRange[]): TimeRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges]
    .map((r) => ({ startTime: formatHm(r.startTime), endTime: formatHm(r.endTime) }))
    .filter((r) => toMinutes(r.endTime) > toMinutes(r.startTime))
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

  const merged: TimeRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push(range);
      continue;
    }
    if (toMinutes(range.startTime) <= toMinutes(last.endTime)) {
      last.endTime = fromMinutes(Math.max(toMinutes(last.endTime), toMinutes(range.endTime)));
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

function subtractBlock(ranges: TimeRange[], block: TimeRange): TimeRange[] {
  const result: TimeRange[] = [];
  const bStart = toMinutes(block.startTime);
  const bEnd = toMinutes(block.endTime);
  for (const range of ranges) {
    const rStart = toMinutes(range.startTime);
    const rEnd = toMinutes(range.endTime);
    if (bEnd <= rStart || bStart >= rEnd) {
      result.push(range);
      continue;
    }
    if (rStart < bStart) {
      result.push({ startTime: fromMinutes(rStart), endTime: fromMinutes(bStart) });
    }
    if (rEnd > bEnd) {
      result.push({ startTime: fromMinutes(bEnd), endTime: fromMinutes(rEnd) });
    }
  }
  return mergeIntervals(result);
}

function buildBlocks(stepMinutes: number): TimeRange[] {
  const step = Math.max(1, stepMinutes);
  const blocks: TimeRange[] = [];
  for (let start = 0; start + step <= 24 * 60; start += step) {
    blocks.push({
      startTime: fromMinutes(start),
      endTime: fromMinutes(start + step),
    });
  }
  return blocks;
}

function resolveDayIntervals(config?: WorkingHour | null): TimeRange[] {
  if (!config || config.closed) return [];
  if (config.intervals && config.intervals.length > 0) {
    return mergeIntervals(
      config.intervals.map((i) => ({
        startTime: formatHm(i.startTime),
        endTime: formatHm(i.endTime),
      }))
    );
  }
  if (config.startTime && config.endTime) {
    return [{ startTime: formatHm(config.startTime), endTime: formatHm(config.endTime) }];
  }
  return [];
}

function isBlockSelected(block: TimeRange, intervals: TimeRange[]): boolean {
  return intervals.some((interval) => overlaps(block, interval));
}

export default function AvailabilityPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [scheduleType, setScheduleType] = useState<'general' | 'staff'>('general');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const [loading, setLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [weeklyConfig, setWeeklyConfig] = useState<DayDraft[]>([]);
  const [timeInterval, setTimeInterval] = useState<number>(30);

  const dayBlocks = useMemo(() => buildBlocks(timeInterval), [timeInterval]);

  const openBulkModal = () => {
    const savedStep =
      workingHours.find((wh) => wh.slotStepMinutes && wh.slotStepMinutes > 0)?.slotStepMinutes || 30;
    setTimeInterval(savedStep);

    const list = DAYS_OF_WEEK.map((d) => {
      const config = workingHours.find((wh) => wh.dayOfWeek === d.value);
      return {
        dayOfWeek: d.value,
        closed: config ? config.closed : false,
        intervals: resolveDayIntervals(config),
        customStart: '09:00',
        customEnd: '10:00',
      };
    });
    setWeeklyConfig(list);
    setShowBulkModal(true);
  };

  const copyMondayToAll = () => {
    const monday = weeklyConfig.find((d) => d.dayOfWeek === 1);
    if (!monday) return;
    setWeeklyConfig((prev) =>
      prev.map((day) =>
        day.dayOfWeek === 1
          ? day
          : {
              ...day,
              closed: monday.closed,
              intervals: monday.intervals.map((i) => ({ ...i })),
            }
      )
    );
  };

  const toggleDayBlock = (dayOfWeek: number, block: TimeRange) => {
    setWeeklyConfig((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek !== dayOfWeek || day.closed) return day;
        const selected = isBlockSelected(block, day.intervals);
        const next = selected
          ? subtractBlock(day.intervals, block)
          : mergeIntervals([...day.intervals, block]);
        return { ...day, intervals: next };
      })
    );
  };

  const addCustomInterval = (dayOfWeek: number) => {
    setWeeklyConfig((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek !== dayOfWeek || day.closed) return day;
        const start = formatHm(day.customStart);
        const end = formatHm(day.customEnd);
        if (toMinutes(end) <= toMinutes(start)) {
          setError('Custom hours must end after they start.');
          return day;
        }
        setError(null);
        return {
          ...day,
          intervals: mergeIntervals([...day.intervals, { startTime: start, endTime: end }]),
        };
      })
    );
  };

  const removeInterval = (dayOfWeek: number, index: number) => {
    setWeeklyConfig((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek !== dayOfWeek) return day;
        return {
          ...day,
          intervals: day.intervals.filter((_, i) => i !== index),
        };
      })
    );
  };

  const handleBulkSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;

    setError(null);
    setMessage(null);
    setBulkSubmitting(true);

    const staffIdParam = scheduleType === 'staff' && selectedStaffId ? parseInt(selectedStaffId) : null;

    const days = weeklyConfig.map((day) => {
      const intervals = day.closed ? [] : mergeIntervals(day.intervals);
      return {
        dayOfWeek: day.dayOfWeek,
        closed: day.closed || intervals.length === 0,
        startTime: intervals[0]?.startTime || null,
        endTime: intervals.length ? intervals[intervals.length - 1].endTime : null,
        intervals: intervals.map((i) => ({
          startTime: i.startTime,
          endTime: i.endTime,
        })),
      };
    });

    try {
      await apiFetch('/api/business/working-hours/batch', {
        method: 'POST',
        body: JSON.stringify({
          branchId: parseInt(selectedBranchId),
          staffId: staffIdParam,
          slotStepMinutes: timeInterval,
          days,
        }),
      });
      setMessage('Weekly working hours configured successfully!');
      setShowBulkModal(false);
      await loadScheduleData(selectedBranchId, scheduleType, selectedStaffId);
    } catch (err: any) {
      setError(err?.message || 'Failed to configure weekly working hours.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    date: '',
    description: '',
  });

  const [breakForms, setBreakForms] = useState<Record<number, { startTime: string; endTime: string }>>({});
  const [pendingHourDelete, setPendingHourDelete] = useState<number | null>(null);
  const [pendingBreakDelete, setPendingBreakDelete] = useState<number | null>(null);
  const [pendingHolidayDelete, setPendingHolidayDelete] = useState<number | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [branchData, staffData] = await Promise.all([
        apiFetch<Branch[]>('/api/business/branches'),
        apiFetch<Staff[]>('/api/business/staff'),
      ]);
      setBranches(branchData);
      setAllStaff(staffData);

      if (branchData.length > 0) {
        const defaultBranchId = branchData[0].id.toString();
        setSelectedBranchId(defaultBranchId);

        const branchStaff = staffData.filter((s) => s.branch.id === parseInt(defaultBranchId));
        setFilteredStaff(branchStaff);
      }
    } catch (err: any) {
      setError(err?.message || 'Could not load availability. Please ensure branches exist.');
    } finally {
      setLoading(false);
    }
  };

  const loadScheduleData = async (branchId: string, type: 'general' | 'staff', staffId: string) => {
    if (!branchId) return;
    setScheduleLoading(true);
    setError(null);

    let urlHours = `/api/business/branches/${branchId}/working-hours`;
    let urlHols = `/api/business/branches/${branchId}/holidays`;

    if (type === 'staff' && staffId) {
      urlHours += `?staffId=${staffId}`;
      urlHols += `?staffId=${staffId}`;
    }

    try {
      const [whData, holData] = await Promise.all([
        apiFetch<WorkingHour[]>(urlHours),
        apiFetch<Holiday[]>(urlHols),
      ]);
      setWorkingHours(whData);
      setHolidays(holData);
      const step = whData.find((wh) => wh.slotStepMinutes && wh.slotStepMinutes > 0)?.slotStepMinutes;
      if (step) setTimeInterval(step);
    } catch (err: any) {
      setError(err?.message || 'Could not load schedule configurations.');
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      const branchStaff = allStaff.filter((s) => s.branch.id === parseInt(selectedBranchId));
      setFilteredStaff(branchStaff);

      setScheduleType('general');
      setSelectedStaffId('');
      loadScheduleData(selectedBranchId, 'general', '');
    }
  }, [selectedBranchId, allStaff]);

  useEffect(() => {
    if (selectedBranchId) {
      if (scheduleType === 'general') {
        loadScheduleData(selectedBranchId, 'general', '');
      } else if (scheduleType === 'staff' && selectedStaffId) {
        loadScheduleData(selectedBranchId, 'staff', selectedStaffId);
      } else {
        setWorkingHours([]);
        setHolidays([]);
      }
    }
  }, [scheduleType, selectedStaffId]);

  const handleBreakChange = (workingHourId: number, field: 'startTime' | 'endTime', value: string) => {
    setBreakForms((prev) => ({
      ...prev,
      [workingHourId]: {
        ...(prev[workingHourId] || { startTime: '12:00', endTime: '13:00' }),
        [field]: value,
      },
    }));
  };

  const handleBreakSubmit = async (e: FormEvent, workingHourId: number) => {
    e.preventDefault();
    const form = breakForms[workingHourId] || { startTime: '12:00', endTime: '13:00' };
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/business/working-hours/${workingHourId}/breaks`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setMessage('Break period added.');
      await loadScheduleData(selectedBranchId, scheduleType, selectedStaffId);
    } catch (err: any) {
      setError(err?.message || 'Failed to add break.');
    }
  };

  const handleHourDelete = async () => {
    if (pendingHourDelete == null) return;
    setConfirmLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/business/working-hours/${pendingHourDelete}`, { method: 'DELETE' });
      setMessage('Day configuration reset.');
      setPendingHourDelete(null);
      await loadScheduleData(selectedBranchId, scheduleType, selectedStaffId);
    } catch (err: any) {
      setError(err?.message || 'Failed to reset day.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleBreakDelete = async () => {
    if (pendingBreakDelete == null) return;
    setConfirmLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/business/breaks/${pendingBreakDelete}`, { method: 'DELETE' });
      setMessage('Break removed.');
      setPendingBreakDelete(null);
      await loadScheduleData(selectedBranchId, scheduleType, selectedStaffId);
    } catch (err: any) {
      setError(err?.message || 'Failed to remove break.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleHolidaySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId || !holidayForm.date) return;
    setError(null);
    setMessage(null);
    const staffIdParam = scheduleType === 'staff' && selectedStaffId ? parseInt(selectedStaffId) : null;
    try {
      await apiFetch('/api/business/holidays', {
        method: 'POST',
        body: JSON.stringify({
          branchId: parseInt(selectedBranchId),
          staffId: staffIdParam,
          date: holidayForm.date,
          description: holidayForm.description || null,
        }),
      });
      setMessage('Closure / absence scheduled.');
      setShowHolidayForm(false);
      setHolidayForm({ date: '', description: '' });
      await loadScheduleData(selectedBranchId, scheduleType, selectedStaffId);
    } catch (err: any) {
      setError(err?.message || 'Failed to schedule closure.');
    }
  };

  const handleHolidayDelete = async () => {
    if (pendingHolidayDelete == null) return;
    setConfirmLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/business/holidays/${pendingHolidayDelete}`, { method: 'DELETE' });
      setMessage('Closure cancelled.');
      setPendingHolidayDelete(null);
      await loadScheduleData(selectedBranchId, scheduleType, selectedStaffId);
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel closure.');
    } finally {
      setConfirmLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <PageHeader title="Availability" subtitle="Configure weekly working hours and closures." />
        <Skeleton variant="row" count={8} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Availability"
        subtitle="Pick free time blocks per day. The time bracket also drives booking slot frequency."
      />

      <FilterBar>
        <div className="form-group" style={{ minWidth: 200 }}>
          <label className="form-label" htmlFor="branchFilter">
            Branch:
          </label>
          <CustomSelect
            options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
            value={selectedBranchId}
            onChange={setSelectedBranchId}
            searchable={false}
            placeholder="Select branch"
          />
        </div>
        <div className="form-group" style={{ minWidth: 200 }}>
          <label className="form-label" htmlFor="schedTypeSelect">
            Schedule:
          </label>
          <CustomSelect
            options={[
              { value: 'general', label: 'Branch default' },
              { value: 'staff', label: 'Staff overrides' },
            ]}
            value={scheduleType}
            onChange={(val) => setScheduleType(val as 'general' | 'staff')}
            searchable={false}
          />
        </div>
        {scheduleType === 'staff' && (
          <>
            <div className="form-group" style={{ minWidth: 220 }}>
              <label className="form-label" htmlFor="staffFilter">
                Staff:
              </label>
              <CustomSelect
                options={filteredStaff.map((s) => ({
                  value: String(s.id),
                  label: s.name,
                  sublabel: s.specialty || 'Generalist',
                }))}
                value={selectedStaffId}
                onChange={setSelectedStaffId}
                searchable={true}
                placeholder="-- Choose staff --"
              />
            </div>
          </>
        )}
      </FilterBar>

      {message && (
        <div className="success-alert">
          <i className="fa-solid fa-circle-check" /> {message}
        </div>
      )}
      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      {branches.length === 0 ? (
        <EmptyState
          icon="fa-location-dot"
          title="Branches required"
          description="Create at least one branch before configuring working hours."
          actionLabel="Add branch"
          onAction={() => {
            window.location.href = '/business/branches';
          }}
        />
      ) : scheduleType === 'staff' && !selectedStaffId ? (
        <EmptyState
          icon="fa-user"
          title="Select a staff member"
          description="Choose a staff member above to manage their schedule overrides."
        />
      ) : scheduleLoading ? (
        <Skeleton variant="row" count={6} />
      ) : (
        <div className={styles.scheduleGrid}>
          <div className={`surface ${styles.hoursColumn}`}>
            <div className={styles.columnHeader}>
              <h3>{scheduleType === 'staff' ? 'Staff working shifts' : 'Branch working hours'}</h3>
              <button type="button" className="btn btn-sm btn-primary" onClick={openBulkModal}>
                <i className="fa-solid fa-calendar-days" /> Configure Week
              </button>
            </div>

            <div className={styles.daysList}>
              {DAYS_OF_WEEK.map((day) => {
                const config = workingHours.find((wh) => wh.dayOfWeek === day.value);
                const intervals = resolveDayIntervals(config);
                const inlineBreak = breakForms[config?.id || 0] || { startTime: '12:00', endTime: '13:00' };
                const stepLabel =
                  config?.slotStepMinutes === 120
                    ? 'every 2 hours'
                    : config?.slotStepMinutes === 60
                      ? 'every 1 hour'
                      : config?.slotStepMinutes === 10
                        ? 'every 10 mins'
                        : config?.slotStepMinutes
                          ? `every ${config.slotStepMinutes} mins`
                          : null;

                return (
                  <div key={day.value} className={styles.dayRow}>
                    <div className={styles.dayInfo}>
                      <span className={styles.dayLabel}>{day.label}</span>
                      {config ? (
                        config.closed || intervals.length === 0 ? (
                          <span className={styles.closedText}>CLOSED</span>
                        ) : (
                          <div className={styles.intervalChips}>
                            {intervals.map((interval, idx) => (
                              <span key={`${interval.startTime}-${interval.endTime}-${idx}`} className={styles.openTime}>
                                {interval.startTime} – {interval.endTime}
                              </span>
                            ))}
                            {stepLabel && <span className={styles.stepHint}>{stepLabel}</span>}
                          </div>
                        )
                      ) : (
                        <span className={styles.notConfiguredText}>
                          {scheduleType === 'staff' ? 'Inheriting branch default' : 'Not configured (CLOSED)'}
                        </span>
                      )}
                    </div>

                    <div className={styles.dayActions}>
                      {config && (
                        <>
                          {!config.closed && config.breaks && config.breaks.length > 0 && (
                            <div className={styles.breaksList}>
                              {config.breaks.map((br) => (
                                <span key={br.id} className={styles.breakBadge}>
                                  {formatHm(br.startTime)} – {formatHm(br.endTime)}
                                  <button
                                    type="button"
                                    onClick={() => setPendingBreakDelete(br.id)}
                                    className={styles.removeBreakBtn}
                                  >
                                    &times;
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          {!config.closed && (
                            <form onSubmit={(e) => handleBreakSubmit(e, config.id)} className={styles.inlineBreakForm}>
                              <input
                                type="time"
                                className="input-field"
                                value={inlineBreak.startTime}
                                onChange={(e) => handleBreakChange(config.id, 'startTime', e.target.value)}
                              />
                              <span>to</span>
                              <input
                                type="time"
                                className="input-field"
                                value={inlineBreak.endTime}
                                onChange={(e) => handleBreakChange(config.id, 'endTime', e.target.value)}
                              />
                              <button type="submit" className={styles.addBreakBtn} title="Add break period">
                                + Break
                              </button>
                            </form>
                          )}

                          <button
                            type="button"
                            className={styles.resetBtn}
                            onClick={() => setPendingHourDelete(config.id)}
                            title="Reset day configuration"
                          >
                            <i className="fa-solid fa-rotate-left" /> Reset
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`surface ${styles.holidaysColumn}`}>
            <div className={styles.columnHeader}>
              <h3>{scheduleType === 'staff' ? 'Staff scheduled absences' : 'Branch closures'}</h3>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowHolidayForm(true)}>
                Add absence
              </button>
            </div>

            {holidays.length === 0 ? (
              <p className={styles.emptyHolidays}>No closures or absences scheduled.</p>
            ) : (
              <div className={styles.holidaysList}>
                {holidays.map((h) => (
                  <div key={h.id} className={styles.holidayRow}>
                    <div>
                      <span className={styles.holidayDate}>{h.date}</span>
                      {h.description && <span className={styles.holidayDesc}>{h.description}</span>}
                    </div>
                    <button
                      type="button"
                      className={styles.deleteHolidayBtn}
                      onClick={() => setPendingHolidayDelete(h.id)}
                      title="Cancel holiday"
                    >
                      <i className="fa-solid fa-trash-can" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        open={showBulkModal}
        title="Configure Weekly Hours"
        onClose={() => setShowBulkModal(false)}
        wide={true}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShowBulkModal(false)}>
              Cancel
            </button>
            <button type="submit" form="bulk-hour-form" className="btn btn-primary" disabled={bulkSubmitting}>
              {bulkSubmitting ? 'Saving...' : 'Save Configuration'}
            </button>
          </>
        }
      >
        <form id="bulk-hour-form" onSubmit={handleBulkSubmit} className={styles.bulkContainer}>
          <div className={styles.bulkHeaderActions}>
            <div className={styles.bracketGroup}>
              <span className={styles.bracketLabel}>Time Bracket:</span>
              <div style={{ width: '140px' }}>
                <CustomSelect
                  options={STEP_OPTIONS}
                  value={timeInterval.toString()}
                  onChange={(val) => setTimeInterval(parseInt(val, 10))}
                  searchable={false}
                  placeholder="Interval"
                />
              </div>
              <span className={styles.bracketHint}>
                Tap blocks to set free hours. Bracket also sets how often bookings start.
              </span>
            </div>
            <button type="button" className={styles.copyAllBtn} onClick={copyMondayToAll}>
              <i className="fa-regular fa-clone" /> Copy Monday&apos;s hours to all days
            </button>
          </div>

          <div className={styles.bulkList}>
            {weeklyConfig.map((day) => {
              const dayLabel = DAYS_OF_WEEK.find((d) => d.value === day.dayOfWeek)?.label || '';
              return (
                <div key={day.dayOfWeek} className={styles.bulkDayCard}>
                  <div className={styles.bulkDayHeader}>
                    <div className={styles.bulkDayLabel}>{dayLabel}</div>
                    <div className={styles.bulkStatusToggle}>
                      <input
                        type="checkbox"
                        id={`toggle-${day.dayOfWeek}`}
                        className={styles.statusCheckbox}
                        checked={!day.closed}
                        onChange={(e) => {
                          const closed = !e.target.checked;
                          setWeeklyConfig((prev) =>
                            prev.map((d) =>
                              d.dayOfWeek === day.dayOfWeek
                                ? {
                                    ...d,
                                    closed,
                                    intervals: closed ? [] : d.intervals.length ? d.intervals : [{ startTime: '09:00', endTime: '17:00' }],
                                  }
                                : d
                            )
                          );
                        }}
                      />
                      <span className={styles.statusLabel}>{day.closed ? 'CLOSED' : 'OPEN'}</span>
                    </div>
                  </div>

                  {!day.closed && (
                    <>
                      <div className={styles.blockGrid}>
                        {dayBlocks.map((block) => {
                          const on = isBlockSelected(block, day.intervals);
                          return (
                            <button
                              key={`${day.dayOfWeek}-${block.startTime}`}
                              type="button"
                              className={`${styles.blockChip} ${on ? styles.blockChipOn : ''}`}
                              onClick={() => toggleDayBlock(day.dayOfWeek, block)}
                            >
                              {block.startTime}–{block.endTime}
                            </button>
                          );
                        })}
                      </div>

                      {day.intervals.length > 0 && (
                        <div className={styles.selectedRanges}>
                          {day.intervals.map((interval, idx) => (
                            <span key={`${interval.startTime}-${interval.endTime}-${idx}`} className={styles.rangeChip}>
                              {interval.startTime} – {interval.endTime}
                              <button type="button" onClick={() => removeInterval(day.dayOfWeek, idx)} aria-label="Remove range">
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className={styles.customRangeRow}>
                        <span className={styles.customLabel}>Add custom hours</span>
                        <CustomTimePicker
                          value={day.customStart}
                          intervalMinutes={Math.min(timeInterval, 30)}
                          onChange={(customStart) => {
                            setWeeklyConfig((prev) =>
                              prev.map((d) => (d.dayOfWeek === day.dayOfWeek ? { ...d, customStart } : d))
                            );
                          }}
                        />
                        <span className={styles.bulkTimeSep}>to</span>
                        <CustomTimePicker
                          value={day.customEnd}
                          intervalMinutes={Math.min(timeInterval, 30)}
                          onChange={(customEnd) => {
                            setWeeklyConfig((prev) =>
                              prev.map((d) => (d.dayOfWeek === day.dayOfWeek ? { ...d, customEnd } : d))
                            );
                          }}
                        />
                        <button type="button" className="btn btn-sm btn-secondary" onClick={() => addCustomInterval(day.dayOfWeek)}>
                          Add
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </form>
      </Modal>

      <Modal
        open={showHolidayForm}
        title="Schedule closure / absence"
        onClose={() => setShowHolidayForm(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShowHolidayForm(false)}>
              Cancel
            </button>
            <button type="submit" form="holiday-form" className="btn btn-primary">
              Schedule closure
            </button>
          </>
        }
      >
        <form id="holiday-form" onSubmit={handleHolidaySubmit} className={styles.modalForm}>
          <div className="form-group">
            <label className="form-label" htmlFor="holidayDate">
              Date
            </label>
            <CustomDatePicker
              id="holidayDate"
              value={holidayForm.date}
              onChange={(date) => setHolidayForm((prev) => ({ ...prev, date }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="holidayDesc">
              Description
            </label>
            <input
              id="holidayDesc"
              type="text"
              className="input-field"
              value={holidayForm.description}
              onChange={(e) => setHolidayForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="e.g. Public holiday or sick leave"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={pendingHourDelete != null}
        title="Reset day"
        message="Remove this day configuration?"
        confirmLabel="Reset"
        danger
        loading={confirmLoading}
        onConfirm={handleHourDelete}
        onCancel={() => setPendingHourDelete(null)}
      />
      <ConfirmDialog
        open={pendingBreakDelete != null}
        title="Remove break"
        message="Remove this break period?"
        confirmLabel="Remove"
        danger
        loading={confirmLoading}
        onConfirm={handleBreakDelete}
        onCancel={() => setPendingBreakDelete(null)}
      />
      <ConfirmDialog
        open={pendingHolidayDelete != null}
        title="Cancel closure"
        message="Cancel this holiday closure?"
        confirmLabel="Cancel closure"
        danger
        loading={confirmLoading}
        onConfirm={handleHolidayDelete}
        onCancel={() => setPendingHolidayDelete(null)}
      />
    </div>
  );
}

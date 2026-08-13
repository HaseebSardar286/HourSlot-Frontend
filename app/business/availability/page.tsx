'use client';

import { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import Modal from '@/components/Modal';
import FilterBar from '@/components/FilterBar';
import ConfirmDialog from '@/components/ConfirmDialog';
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

interface WorkingHour {
  id: number;
  dayOfWeek: number; // 1 = Monday, 7 = Sunday
  startTime?: string; // "HH:mm:ss"
  endTime?: string;   // "HH:mm:ss"
  closed: boolean;
  breaks?: BreakPeriod[];
}

interface Holiday {
  id: number;
  date: string; // "YYYY-MM-DD"
  description?: string;
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

  const [showHourForm, setShowHourForm] = useState(false);
  const [hourForm, setHourForm] = useState({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    closed: false,
  });

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
        
        const branchStaff = staffData.filter(s => s.branch.id === parseInt(defaultBranchId));
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
    } catch (err: any) {
      setError(err?.message || 'Could not load schedule configurations.');
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Update staff list and reload schedule when branch changes
  useEffect(() => {
    if (selectedBranchId) {
      const branchStaff = allStaff.filter(s => s.branch.id === parseInt(selectedBranchId));
      setFilteredStaff(branchStaff);
      
      // Reset staff selection
      setScheduleType('general');
      setSelectedStaffId('');
      loadScheduleData(selectedBranchId, 'general', '');
    }
  }, [selectedBranchId, allStaff]);

  // Reload schedule when toggle scheduleType or selectedStaffId changes
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

  // Format LocalTime "HH:mm:ss" to "HH:mm"
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    return timeStr.slice(0, 5);
  };

  const handleHourSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;

    setError(null);
    setMessage(null);
    
    const staffIdParam = scheduleType === 'staff' && selectedStaffId ? parseInt(selectedStaffId) : null;

    try {
      await apiFetch('/api/business/working-hours', {
        method: 'POST',
        body: JSON.stringify({
          ...hourForm,
          branchId: parseInt(selectedBranchId),
          staffId: staffIdParam,
        }),
      });
      setMessage('Working hours configured successfully!');
      setShowHourForm(false);
      await loadScheduleData(selectedBranchId, scheduleType, selectedStaffId);
    } catch (err: any) {
      setError(err?.message || 'Failed to configure working hours.');
    }
  };

  const handleHourDelete = async () => {
    if (pendingHourDelete == null) return;
    setConfirmLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/business/working-hours/${pendingHourDelete}`, {
        method: 'DELETE',
      });
      setMessage('Working hour record removed.');
      setPendingHourDelete(null);
      await loadScheduleData(selectedBranchId, scheduleType, selectedStaffId);
    } catch (err: any) {
      setError(err?.message || 'Failed to remove working hour record.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleBreakChange = (whId: number, field: string, value: string) => {
    setBreakForms((prev) => ({
      ...prev,
      [whId]: {
        ...(prev[whId] || { startTime: '12:00', endTime: '13:00' }),
        [field]: value,
      },
    }));
  };

  const handleBreakSubmit = async (e: FormEvent, whId: number) => {
    e.preventDefault();
    const breakForm = breakForms[whId] || { startTime: '12:00', endTime: '13:00' };

    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/business/working-hours/${whId}/breaks`, {
        method: 'POST',
        body: JSON.stringify(breakForm),
      });
      setMessage('Break period added!');
      // Clear inline form
      setBreakForms((prev) => {
        const copy = { ...prev };
        delete copy[whId];
        return copy;
      });
      await loadScheduleData(selectedBranchId, scheduleType, selectedStaffId);
    } catch (err: any) {
      setError(err?.message || 'Failed to add break period.');
    }
  };

  const handleBreakDelete = async () => {
    if (pendingBreakDelete == null) return;
    setConfirmLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/business/breaks/${pendingBreakDelete}`, {
        method: 'DELETE',
      });
      setMessage('Break period removed.');
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
          ...holidayForm,
          branchId: parseInt(selectedBranchId),
          staffId: staffIdParam,
        }),
      });
      setMessage('Holiday closure scheduled!');
      setShowHolidayForm(false);
      setHolidayForm({ date: '', description: '' });
      await loadScheduleData(selectedBranchId, scheduleType, selectedStaffId);
    } catch (err: any) {
      setError(err?.message || 'Failed to add holiday.');
    }
  };

  const handleHolidayDelete = async () => {
    if (pendingHolidayDelete == null) return;
    setConfirmLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/business/holidays/${pendingHolidayDelete}`, {
        method: 'DELETE',
      });
      setMessage('Holiday closure cancelled.');
      setPendingHolidayDelete(null);
      await loadScheduleData(selectedBranchId, scheduleType, selectedStaffId);
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel holiday.');
    } finally {
      setConfirmLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.availabilityContainer}>
        <Skeleton variant="title" />
        <Skeleton variant="row" count={4} />
      </div>
    );
  }

  return (
    <div className={styles.availabilityContainer}>
      <PageHeader
        title="Availability"
        subtitle="Configure branch hours, staff overrides, breaks, and closures."
      />

      <FilterBar>
        <label className="form-label" htmlFor="branchFilter">
          Branch
        </label>
        <select
          id="branchFilter"
          className="select-field"
          value={selectedBranchId}
          onChange={(e) => setSelectedBranchId(e.target.value)}
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <label className="form-label" htmlFor="schedTypeSelect">
          Schedule
        </label>
        <select
          id="schedTypeSelect"
          className="select-field"
          value={scheduleType}
          onChange={(e) => setScheduleType(e.target.value as any)}
        >
          <option value="general">Branch default</option>
          <option value="staff">Staff overrides</option>
        </select>

        {scheduleType === 'staff' && (
          <>
            <label className="form-label" htmlFor="staffFilter">
              Staff
            </label>
            <select
              id="staffFilter"
              className="select-field"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
            >
              <option value="">-- Choose staff --</option>
              {filteredStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.specialty || 'Generalist'})
                </option>
              ))}
            </select>
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
              <h3>
                {scheduleType === 'staff' ? 'Staff working shifts' : 'Branch working hours'}
              </h3>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowHourForm(true)}>
                Configure day
              </button>
            </div>

            <div className={styles.daysList}>
              {DAYS_OF_WEEK.map((day) => {
                const config = workingHours.find((wh) => wh.dayOfWeek === day.value);
                const inlineBreak = breakForms[config?.id || 0] || { startTime: '12:00', endTime: '13:00' };

                return (
                  <div key={day.value} className={styles.dayRow}>
                    <div className={styles.dayInfo}>
                      <span className={styles.dayLabel}>{day.label}</span>
                      {config ? (
                        config.closed ? (
                          <span className={styles.closedText}>CLOSED</span>
                        ) : (
                          <span className={styles.openTime}>
                            {formatTime(config.startTime)} - {formatTime(config.endTime)}
                          </span>
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
                          {/* Breaks list */}
                          {!config.closed && config.breaks && config.breaks.length > 0 && (
                            <div className={styles.breaksList}>
                              {config.breaks.map((br) => (
                                <span key={br.id} className={styles.breakBadge}>
                                  {formatTime(br.startTime)} – {formatTime(br.endTime)}
                                  <button type="button" onClick={() => setPendingBreakDelete(br.id)} className={styles.removeBreakBtn}>
                                    &times;
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Add break inline form */}
                          {!config.closed && (
                            <form 
                              onSubmit={(e) => handleBreakSubmit(e, config.id)}
                              className={styles.inlineBreakForm}
                            >
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
              <h3>
                {scheduleType === 'staff' ? 'Staff scheduled absences' : 'Branch closures'}
              </h3>
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
        open={showHourForm}
        title="Configure day hours"
        onClose={() => setShowHourForm(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShowHourForm(false)}>
              Cancel
            </button>
            <button type="submit" form="hour-form" className="btn btn-primary">
              Save configuration
            </button>
          </>
        }
      >
        <form id="hour-form" onSubmit={handleHourSubmit} className={styles.modalForm}>
          <div className="form-group">
            <label className="form-label" htmlFor="dayOfWeekSelect">
              Day of week
            </label>
            <select
              id="dayOfWeekSelect"
              className="select-field"
              value={hourForm.dayOfWeek}
              onChange={(e) => setHourForm((prev) => ({ ...prev, dayOfWeek: parseInt(e.target.value) }))}
            >
              {DAYS_OF_WEEK.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.checkRow}>
            <input
              id="closedCheckbox"
              type="checkbox"
              checked={hourForm.closed}
              onChange={(e) => setHourForm((prev) => ({ ...prev, closed: e.target.checked }))}
            />
            <label htmlFor="closedCheckbox" className="form-label">
              Mark as closed on this day
            </label>
          </div>

          {!hourForm.closed && (
            <div className={styles.twoCol}>
              <div className="form-group">
                <label className="form-label" htmlFor="hourStart">
                  Start time
                </label>
                <input
                  id="hourStart"
                  type="time"
                  className="input-field"
                  value={hourForm.startTime}
                  onChange={(e) => setHourForm((prev) => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="hourEnd">
                  End time
                </label>
                <input
                  id="hourEnd"
                  type="time"
                  className="input-field"
                  value={hourForm.endTime}
                  onChange={(e) => setHourForm((prev) => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>
          )}
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
            <input
              id="holidayDate"
              type="date"
              className="input-field"
              value={holidayForm.date}
              onChange={(e) => setHolidayForm((prev) => ({ ...prev, date: e.target.value }))}
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

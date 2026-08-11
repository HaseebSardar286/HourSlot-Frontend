'use client';

import { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
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

  // Form states
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

  // Inline break form mapping: workingHourId -> { startTime, endTime }
  const [breakForms, setBreakForms] = useState<Record<number, { startTime: string; endTime: string }>>({});

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

  const handleHourDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this day configuration?')) return;
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/business/working-hours/${id}`, {
        method: 'DELETE',
      });
      setMessage('Working hour record removed.');
      await loadScheduleData(selectedBranchId, scheduleType, selectedStaffId);
    } catch (err: any) {
      setError(err?.message || 'Failed to remove working hour record.');
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

  const handleBreakDelete = async (breakId: number) => {
    if (!confirm('Remove this break period?')) return;
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/business/breaks/${breakId}`, {
        method: 'DELETE',
      });
      setMessage('Break period removed.');
      await loadScheduleData(selectedBranchId, scheduleType, selectedStaffId);
    } catch (err: any) {
      setError(err?.message || 'Failed to remove break.');
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

  const handleHolidayDelete = async (id: number) => {
    if (!confirm('Cancel this holiday closure?')) return;
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/business/holidays/${id}`, {
        method: 'DELETE',
      });
      setMessage('Holiday closure cancelled.');
      await loadScheduleData(selectedBranchId, scheduleType, selectedStaffId);
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel holiday.');
    }
  };

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className={styles.availabilityContainer}>
      <div className={styles.headerRow}>
        <div className={styles.branchSelectArea}>
          <label className="form-label" htmlFor="branchFilter" style={{ marginBottom: 0, marginRight: '10px' }}>
            Select Branch:
          </label>
          <select
            id="branchFilter"
            className="input-field"
            style={{ width: '180px', padding: '6px 12px', marginRight: '15px' }}
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <label className="form-label" htmlFor="schedTypeSelect" style={{ marginBottom: 0, marginRight: '10px' }}>
            Schedule:
          </label>
          <select
            id="schedTypeSelect"
            className="input-field"
            style={{ width: '160px', padding: '6px 12px', marginRight: '15px' }}
            value={scheduleType}
            onChange={(e) => setScheduleType(e.target.value as any)}
          >
            <option value="general">Branch Default</option>
            <option value="staff">Staff Overrides</option>
          </select>

          {scheduleType === 'staff' && (
            <>
              <label className="form-label" htmlFor="staffFilter" style={{ marginBottom: 0, marginRight: '10px' }}>
                Staff Member:
              </label>
              <select
                id="staffFilter"
                className="input-field"
                style={{ width: '180px', padding: '6px 12px' }}
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
              >
                <option value="">-- Choose Staff --</option>
                {filteredStaff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.specialty || 'Generalist'})</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {message && <div className="success-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-circle-check"></i> {message}</div>}
      {error && <div className="error-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-triangle-exclamation"></i> {error}</div>}

      {branches.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📍</div>
          <h3>Branches Required</h3>
          <p style={{ color: 'var(--text-secondary)' }}>You must create at least one branch before configuring working hours.</p>
        </div>
      ) : scheduleType === 'staff' && !selectedStaffId ? (
        <div className="glass-card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>👤</div>
          <h3>Select a Staff Member</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Choose a staff member from the dropdown above to manage their schedule overrides.</p>
        </div>
      ) : scheduleLoading ? (
        <div className={styles.loaderContainer}>
          <div className="spinner" />
        </div>
      ) : (
        <div className={styles.scheduleGrid}>
          {/* Working Hours Left Column */}
          <div className={styles.hoursColumn}>
            <div className={styles.columnHeader}>
              <h3>
                {scheduleType === 'staff' ? 'Staff Working Shifts' : 'Branch Working Hours'}
              </h3>
              <button className="btn btn-sm" onClick={() => setShowHourForm(true)}>
                Configure Day
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
                                  ☕ {formatTime(br.startTime)} - {formatTime(br.endTime)}
                                  <button onClick={() => handleBreakDelete(br.id)} className={styles.removeBreakBtn}>
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
                            className={styles.resetBtn} 
                            onClick={() => handleHourDelete(config.id)}
                            title="Reset day configuration"
                          >
                            <i className="fa-solid fa-rotate-left"></i> Reset
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Holidays Right Column */}
          <div className={styles.holidaysColumn}>
            <div className={styles.columnHeader}>
              <h3>
                {scheduleType === 'staff' ? 'Staff Scheduled Absences' : 'Branch Closures'}
              </h3>
              <button className="btn btn-sm" onClick={() => setShowHolidayForm(true)}>
                Add Absence
              </button>
            </div>

            {holidays.length === 0 ? (
              <div className="glass-card text-center" style={{ padding: '30px', background: 'rgba(255,255,255,0.01)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No closures/absences scheduled.</p>
              </div>
            ) : (
              <div className={styles.holidaysList}>
                {holidays.map((h) => (
                  <div key={h.id} className={styles.holidayRow}>
                    <div>
                      <span className={styles.holidayDate}>{h.date}</span>
                      {h.description && <span className={styles.holidayDesc}>{h.description}</span>}
                    </div>
                    <button className={styles.deleteHolidayBtn} onClick={() => handleHolidayDelete(h.id)} title="Cancel holiday">
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Configure Hour Dialog */}
      {showHourForm && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modalContent}`}>
            <div className={styles.modalHeader}>
              <h3>Configure Day Hours</h3>
              <button className={styles.closeBtn} onClick={() => setShowHourForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleHourSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="dayOfWeekSelect">Day of Week</label>
                <select
                  id="dayOfWeekSelect"
                  className="input-field"
                  value={hourForm.dayOfWeek}
                  onChange={(e) => setHourForm((prev) => ({ ...prev, dayOfWeek: parseInt(e.target.value) }))}
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
                <input
                  id="closedCheckbox"
                  type="checkbox"
                  checked={hourForm.closed}
                  onChange={(e) => setHourForm((prev) => ({ ...prev, closed: e.target.checked }))}
                />
                <label htmlFor="closedCheckbox" className="form-label" style={{ marginBottom: 0 }}>
                  Mark as Closed on this Day
                </label>
              </div>

              {!hourForm.closed && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="hourStart">Start Time</label>
                    <input
                      id="hourStart"
                      type="time"
                      className="input-field"
                      value={hourForm.startTime}
                      onChange={(e) => setHourForm((prev) => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="hourEnd">End Time</label>
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

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                Save Configuration
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Holiday Dialog */}
      {showHolidayForm && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modalContent}`}>
            <div className={styles.modalHeader}>
              <h3>Schedule Closure/Absence</h3>
              <button className={styles.closeBtn} onClick={() => setShowHolidayForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleHolidaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="holidayDate">Date</label>
                <input
                  id="holidayDate"
                  type="date"
                  className="input-field"
                  value={holidayForm.date}
                  onChange={(e) => setHolidayForm((prev) => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="holidayDesc">Description (e.g. Public Holiday or Sick Leave)</label>
                <input
                  id="holidayDesc"
                  type="text"
                  className="input-field"
                  value={holidayForm.description}
                  onChange={(e) => setHolidayForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. Out of office"
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                Schedule Closure
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

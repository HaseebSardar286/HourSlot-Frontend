'use client';

import { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import styles from './dashboard.module.css';

interface BusinessProfile {
  id: number;
  name: string;
  description: string;
  logoUrl?: string;
  verified: boolean;
  rating?: string;
}

interface Branch {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phoneNumber?: string;
}

interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
}

interface Staff {
  id: number;
  name: string;
  designation?: string;
  rating?: string;
}

export default function BusinessDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'branches', 'services', 'staff', 'availability'

  // Data State
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);

  // Alerts
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form States
  const [branchForm, setBranchForm] = useState({
    name: '',
    address: '',
    latitude: 37.7749,
    longitude: -122.4194,
    phoneNumber: '',
  });

  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    price: 0,
    durationMinutes: 30,
  });

  const [staffForm, setStaffForm] = useState({
    name: '',
    designation: '',
    branchId: '',
  });

  const [hoursForm, setHoursForm] = useState({
    branchId: '',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    closed: false,
  });

  const [holidayForm, setHolidayForm] = useState({
    branchId: '',
    date: '',
    description: '',
  });

  const clearAlerts = () => {
    setMessage(null);
    setError(null);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    clearAlerts();
  };

  // API Call Helpers
  const loadBusinessProfile = async () => {
    setLoading(true);
    try {
      const profile = await apiFetch<BusinessProfile>('/api/business/profile');
      setBusiness(profile);
      await Promise.all([loadBranches(), loadServices()]);
    } catch (err: any) {
      setError('Could not load business profile. Have you registered your business yet?');
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const data = await apiFetch<Branch[]>('/api/business/branches');
      setBranches(data);
      if (data.length > 0) {
        const defaultBranchId = data[0].id.toString();
        setStaffForm((prev) => ({ ...prev, branchId: defaultBranchId }));
        setHoursForm((prev) => ({ ...prev, branchId: defaultBranchId }));
        setHolidayForm((prev) => ({ ...prev, branchId: defaultBranchId }));

        // Load staff for default branch
        await loadStaff(data[0].id);
      }
    } catch {
      // ignore
    }
  };

  const loadServices = async () => {
    try {
      const data = await apiFetch<Service[]>('/api/business/services');
      setServices(data);
    } catch {
      // ignore
    }
  };

  const loadStaff = async (branchId: number) => {
    try {
      const data = await apiFetch<Staff[]>(`/api/business/branches/${branchId}/staff`);
      setStaffList(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadBusinessProfile();
  }, []);

  // Form Submissions
  const onAddBranch = async (e: FormEvent) => {
    e.preventDefault();
    if (!branchForm.name || !branchForm.address) return;

    try {
      const res = await apiFetch<{ message: string }>('/api/business/branches', {
        method: 'POST',
        body: JSON.stringify(branchForm),
      });
      setMessage(res.message);
      setBranchForm({
        name: '',
        address: '',
        latitude: 37.7749,
        longitude: -122.4194,
        phoneNumber: '',
      });
      await loadBranches();
    } catch (err: any) {
      setError(err?.message || 'Failed to add branch');
    }
  };

  const onAddService = async (e: FormEvent) => {
    e.preventDefault();
    if (!serviceForm.name) return;

    try {
      const res = await apiFetch<{ message: string }>('/api/business/services', {
        method: 'POST',
        body: JSON.stringify(serviceForm),
      });
      setMessage(res.message);
      setServiceForm({
        name: '',
        description: '',
        price: 0,
        durationMinutes: 30,
      });
      await loadServices();
    } catch (err: any) {
      setError(err?.message || 'Failed to add service');
    }
  };

  const onAddStaff = async (e: FormEvent) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.branchId) return;

    try {
      const res = await apiFetch<{ message: string }>('/api/business/staff', {
        method: 'POST',
        body: JSON.stringify(staffForm),
      });
      setMessage(res.message);
      const currentBranchId = staffForm.branchId;
      setStaffForm((prev) => ({ ...prev, name: '', designation: '' }));
      await loadStaff(Number(currentBranchId));
    } catch (err: any) {
      setError(err?.message || 'Failed to add staff');
    }
  };

  const onConfigureHours = async (e: FormEvent) => {
    e.preventDefault();
    if (!hoursForm.branchId) return;

    try {
      const res = await apiFetch<{ message: string }>('/api/business/working-hours', {
        method: 'POST',
        body: JSON.stringify(hoursForm),
      });
      setMessage(res.message);
    } catch (err: any) {
      setError(err?.message || 'Failed to update hours');
    }
  };

  const onAddHoliday = async (e: FormEvent) => {
    e.preventDefault();
    if (!holidayForm.branchId || !holidayForm.date) return;

    try {
      const res = await apiFetch<{ message: string }>('/api/business/holidays', {
        method: 'POST',
        body: JSON.stringify(holidayForm),
      });
      setMessage(res.message);
      setHolidayForm((prev) => ({ ...prev, date: '', description: '' }));
    } catch (err: any) {
      setError(err?.message || 'Failed to register holiday');
    }
  };

  if (loading && !business) {
    return (
      <div className={styles.dashboardWrapper}>
        <p>Loading business dashboard...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardWrapper}>
      {/* Sidebar navigation */}
      <div className={styles.dashboardSidebar}>
        <div className="glass-card">
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarAvatar}>💼</div>
            <h3>{business?.name || 'My Business'}</h3>
            <span
              className={`badge ${
                business?.verified ? 'badge-success' : 'badge-warning'
              }`}
            >
              {business?.verified ? 'Verified' : 'Pending Verification'}
            </span>
          </div>

          <hr className="divider" />

          <ul className={styles.navMenu}>
            <li>
              <button
                className={`${styles.menuItem} ${
                  activeTab === 'overview' ? styles.active : ''
                }`}
                onClick={() => handleTabChange('overview')}
              >
                <span>🏠</span> Overview
              </button>
            </li>
            <li>
              <button
                className={`${styles.menuItem} ${
                  activeTab === 'branches' ? styles.active : ''
                }`}
                onClick={() => handleTabChange('branches')}
              >
                <span>🏢</span> Branches
              </button>
            </li>
            <li>
              <button
                className={`${styles.menuItem} ${
                  activeTab === 'services' ? styles.active : ''
                }`}
                onClick={() => handleTabChange('services')}
              >
                <span>✂️</span> Services
              </button>
            </li>
            <li>
              <button
                className={`${styles.menuItem} ${
                  activeTab === 'staff' ? styles.active : ''
                }`}
                onClick={() => handleTabChange('staff')}
              >
                <span>👥</span> Staff Members
              </button>
            </li>
            <li>
              <button
                className={`${styles.menuItem} ${
                  activeTab === 'availability' ? styles.active : ''
                }`}
                onClick={() => handleTabChange('availability')}
              >
                <span>📅</span> Working Hours
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Main dashboard content area */}
      <div className={styles.dashboardContent}>
        {message && (
          <div className="success-alert">
            <span>✅</span> {message}
          </div>
        )}
        {error && (
          <div className="error-alert">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className={styles.tabPanel}>
            <div className="glass-card">
              <h2>Overview</h2>
              <p className={styles.panelSubtitle}>
                Performance metrics and details for {business?.name}
              </p>

              <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                  <span className={styles.metricIcon}>💰</span>
                  <div className={styles.metricInfo}>
                    <h4>Revenue</h4>
                    <p className={styles.metricValue}>$0.00</p>
                  </div>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricIcon}>📅</span>
                  <div className={styles.metricInfo}>
                    <h4>Bookings</h4>
                    <p className={styles.metricValue}>0</p>
                  </div>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricIcon}>⭐</span>
                  <div className={styles.metricInfo}>
                    <h4>Rating</h4>
                    <p className={styles.metricValue}>
                      {business?.rating || '0.0'}
                    </p>
                  </div>
                </div>
              </div>

              <div className={styles.businessProfileDetail}>
                <h3>About Your Business</h3>
                <p>{business?.description || 'No description provided.'}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BRANCHES */}
        {activeTab === 'branches' && (
          <div className={styles.tabPanel}>
            <div className="glass-card">
              <h2>Manage Branches</h2>
              <p className={styles.panelSubtitle}>
                Add and configure physical location coordinates for discovery
              </p>

              <form onSubmit={onAddBranch} className={styles.horizontalFormGrid}>
                <div className="form-group">
                  <label className="form-label">Branch Name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Main Branch"
                    value={branchForm.name}
                    onChange={(e) =>
                      setBranchForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="123 Main St"
                    value={branchForm.address}
                    onChange={(e) =>
                      setBranchForm((prev) => ({ ...prev, address: e.target.value }))
                    }
                  />
                </div>
                <div className="form-row">
                  <div className="form-group half-width">
                    <label className="form-label">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      className="input-field"
                      value={branchForm.latitude}
                      onChange={(e) =>
                        setBranchForm((prev) => ({
                          ...prev,
                          latitude: parseFloat(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="form-group half-width">
                    <label className="form-label">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      className="input-field"
                      value={branchForm.longitude}
                      onChange={(e) =>
                        setBranchForm((prev) => ({
                          ...prev,
                          longitude: parseFloat(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="555-0199"
                    value={branchForm.phoneNumber}
                    onChange={(e) =>
                      setBranchForm((prev) => ({ ...prev, phoneNumber: e.target.value }))
                    }
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Add Branch
                </button>
              </form>

              <div className={styles.listSection}>
                <h3>Branch List</h3>
                <div className={styles.listGrid}>
                  {branches.length > 0 ? (
                    branches.map((branch) => (
                      <div key={branch.id} className={styles.listItemCard}>
                        <h4>{branch.name}</h4>
                        <p className={styles.itemMeta}>📍 {branch.address}</p>
                        <p className={styles.itemMeta}>
                          📞 {branch.phoneNumber || 'No phone'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className={styles.noItems}>No branches registered yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SERVICES */}
        {activeTab === 'services' && (
          <div className={styles.tabPanel}>
            <div className="glass-card">
              <h2>Services Offered</h2>
              <p className={styles.panelSubtitle}>
                Setup the menu of services and price points
              </p>

              <form onSubmit={onAddService} className={styles.horizontalFormGrid}>
                <div className="form-group">
                  <label className="form-label">Service Name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Haircut or Consultation"
                    value={serviceForm.name}
                    onChange={(e) =>
                      setServiceForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Price ($)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={serviceForm.price}
                    onChange={(e) =>
                      setServiceForm((prev) => ({
                        ...prev,
                        price: parseFloat(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (minutes)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={serviceForm.durationMinutes}
                    onChange={(e) =>
                      setServiceForm((prev) => ({
                        ...prev,
                        durationMinutes: parseInt(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Details about this service"
                    value={serviceForm.description}
                    onChange={(e) =>
                      setServiceForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Add Service
                </button>
              </form>

              <div className={styles.listSection}>
                <h3>Service Catalog</h3>
                <div className={styles.listGrid}>
                  {services.length > 0 ? (
                    services.map((svc) => (
                      <div key={svc.id} className={styles.listItemCard}>
                        <div className={styles.itemHeader}>
                          <h4>{svc.name}</h4>
                          <span className={styles.priceTag}>${svc.price}</span>
                        </div>
                        <p className={styles.itemMeta}>⏳ {svc.durationMinutes} minutes</p>
                        <p className={styles.itemDesc}>{svc.description}</p>
                      </div>
                    ))
                  ) : (
                    <p className={styles.noItems}>No services cataloged yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: STAFF */}
        {activeTab === 'staff' && (
          <div className={styles.tabPanel}>
            <div className="glass-card">
              <h2>Manage Staff</h2>
              <p className={styles.panelSubtitle}>
                Register service providers and link them to branches
              </p>

              <form onSubmit={onAddStaff} className={styles.horizontalFormGrid}>
                <div className="form-group">
                  <label className="form-label">Staff Name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Dr. Sarah Smith"
                    value={staffForm.name}
                    onChange={(e) =>
                      setStaffForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Therapist or Barber"
                    value={staffForm.designation}
                    onChange={(e) =>
                      setStaffForm((prev) => ({
                        ...prev,
                        designation: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Assigned Branch</label>
                  <select
                    className="input-field"
                    value={staffForm.branchId}
                    onChange={(e) => {
                      const bId = e.target.value;
                      setStaffForm((prev) => ({ ...prev, branchId: bId }));
                      loadStaff(Number(bId));
                    }}
                  >
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary">
                  Add Staff
                </button>
              </form>

              <div className={styles.listSection}>
                <h3>Staff Roster</h3>
                <div className={styles.listGrid}>
                  {staffList.length > 0 ? (
                    staffList.map((staff) => (
                      <div key={staff.id} className={styles.listItemCard}>
                        <h4>{staff.name}</h4>
                        <p className={styles.itemMeta}>
                          🎓 {staff.designation || 'No designation'}
                        </p>
                        <p className={styles.itemMeta}>
                          ⭐ {staff.rating || '0.0'} (No reviews)
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className={styles.noItems}>
                      No staff registered for this branch.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AVAILABILITY */}
        {activeTab === 'availability' && (
          <div className={styles.tabPanel}>
            <div className="glass-card">
              <h2>Working Hours & Holidays</h2>
              <p className={styles.panelSubtitle}>
                Configure slot limits, breaks, and off days
              </p>

              <div className={styles.splitForms}>
                <div className={styles.subFormBlock}>
                  <h3>Weekly Schedule</h3>
                  <form onSubmit={onConfigureHours} className={styles.verticalFormBlock}>
                    <div className="form-group">
                      <label className="form-label">Select Branch</label>
                      <select
                        className="input-field"
                        value={hoursForm.branchId}
                        onChange={(e) =>
                          setHoursForm((prev) => ({
                            ...prev,
                            branchId: e.target.value,
                          }))
                        }
                      >
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Day of the Week</label>
                      <select
                        className="input-field"
                        value={hoursForm.dayOfWeek}
                        onChange={(e) =>
                          setHoursForm((prev) => ({
                            ...prev,
                            dayOfWeek: parseInt(e.target.value),
                          }))
                        }
                      >
                        <option value={1}>Monday</option>
                        <option value={2}>Tuesday</option>
                        <option value={3}>Wednesday</option>
                        <option value={4}>Thursday</option>
                        <option value={5}>Friday</option>
                        <option value={6}>Saturday</option>
                        <option value={7}>Sunday</option>
                      </select>
                    </div>
                    <div className="form-row">
                      <div className="form-group half-width">
                        <label className="form-label">Start Time</label>
                        <input
                          type="time"
                          className="input-field"
                          value={hoursForm.startTime}
                          onChange={(e) =>
                            setHoursForm((prev) => ({
                              ...prev,
                              startTime: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="form-group half-width">
                        <label className="form-label">End Time</label>
                        <input
                          type="time"
                          className="input-field"
                          value={hoursForm.endTime}
                          onChange={(e) =>
                            setHoursForm((prev) => ({
                              ...prev,
                              endTime: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="form-group checkbox-group">
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={hoursForm.closed}
                          onChange={(e) =>
                            setHoursForm((prev) => ({
                              ...prev,
                              closed: e.target.checked,
                            }))
                          }
                        />
                        Branch Closed on this day
                      </label>
                    </div>
                    <button type="submit" className="btn btn-primary">
                      Save Schedule
                    </button>
                  </form>
                </div>

                <div className={styles.subFormBlock}>
                  <h3>Register Holidays (Days Off)</h3>
                  <form onSubmit={onAddHoliday} className={styles.verticalFormBlock}>
                    <div className="form-group">
                      <label className="form-label">Select Branch</label>
                      <select
                        className="input-field"
                        value={holidayForm.branchId}
                        onChange={(e) =>
                          setHolidayForm((prev) => ({
                            ...prev,
                            branchId: e.target.value,
                          }))
                        }
                      >
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Holiday Date</label>
                      <input
                        type="date"
                        className="input-field"
                        value={holidayForm.date}
                        onChange={(e) =>
                          setHolidayForm((prev) => ({
                            ...prev,
                            date: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Labor Day"
                        value={holidayForm.description}
                        onChange={(e) =>
                          setHolidayForm((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <button type="submit" className="btn btn-primary">
                      Add Holiday
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

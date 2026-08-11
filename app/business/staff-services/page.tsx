'use client';

import { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import styles from './staff-services.module.css';

interface Staff {
  id: number;
  name: string;
  specialty?: string;
}

interface Service {
  id: number;
  name: string;
  price: number;
}

interface StaffServiceAssignment {
  id: number;
  staff: Staff;
  service: Service;
  priceOverride?: number | null;
}

export default function StaffServicesPage() {
  const [assignments, setAssignments] = useState<StaffServiceAssignment[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<StaffServiceAssignment | null>(null);
  const [formData, setFormData] = useState({
    staffId: '',
    serviceId: '',
    priceOverride: '',
    useDefaultPrice: true,
  });

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assigns, staff, svcs] = await Promise.all([
        apiFetch<StaffServiceAssignment[]>('/api/business/staff-services'),
        apiFetch<Staff[]>('/api/business/staff'),
        apiFetch<Service[]>('/api/business/services'),
      ]);
      setAssignments(assigns);
      setStaffList(staff);
      setServices(svcs);
    } catch (err: any) {
      setError(err?.message || 'Could not load staff-services mappings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddClick = () => {
    setEditingAssignment(null);
    setFormData({
      staffId: staffList.length > 0 ? staffList[0].id.toString() : '',
      serviceId: services.length > 0 ? services[0].id.toString() : '',
      priceOverride: '',
      useDefaultPrice: true,
    });
    setShowModal(true);
  };

  const handleEditClick = (assign: StaffServiceAssignment) => {
    setEditingAssignment(assign);
    setFormData({
      staffId: assign.staff.id.toString(),
      serviceId: assign.service.id.toString(),
      priceOverride: assign.priceOverride ? assign.priceOverride.toString() : '',
      useDefaultPrice: assign.priceOverride === null || assign.priceOverride === undefined,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.staffId || !formData.serviceId) {
      setError('Please select a staff member and service.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const payload = {
      staffId: parseInt(formData.staffId),
      serviceId: parseInt(formData.serviceId),
      priceOverride: formData.useDefaultPrice ? null : parseFloat(formData.priceOverride),
    };

    try {
      if (editingAssignment) {
        await apiFetch(`/api/business/staff-services/${editingAssignment.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setMessage('Assignment price updated successfully!');
      } else {
        await apiFetch('/api/business/staff-services', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setMessage('Service assigned to staff member!');
      }
      setShowModal(false);
      await loadInitialData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save mapping.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this service assignment?')) return;
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/business/staff-services/${id}`, {
        method: 'DELETE',
      });
      setMessage('Assignment removed successfully.');
      await loadInitialData();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete assignment.');
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
    <div className={styles.assignmentsContainer}>
      <div className={styles.headerRow}>
        <p style={{ color: 'var(--text-secondary)' }}>
          Map specific services to staff members and configure specialty price overrides.
        </p>
        <button className="btn btn-primary" onClick={handleAddClick} disabled={staffList.length === 0 || services.length === 0}>
          <i className="fa-solid fa-plus"></i> Assign Service
        </button>
      </div>

      {message && <div className="success-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-circle-check"></i> {message}</div>}
      {error && <div className="error-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-triangle-exclamation"></i> {error}</div>}

      {staffList.length === 0 || services.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🤝</div>
          <h3>Requirements Missing</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            You need at least one registered staff member and one service to configure assignments.
          </p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
          <h3>No Assignments Created</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Assign services to staff members to allow customer bookings.</p>
          <button className="btn btn-primary" onClick={handleAddClick}>Assign Service</button>
        </div>
      ) : (
        <div className="glass-card table-responsive" style={{ padding: '10px 0' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Service Offered</th>
                <th>Default Rate</th>
                <th>Assigned Price / Override</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assign) => (
                <tr key={assign.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#ffffff' }}>{assign.staff.name}</div>
                    {assign.staff.specialty && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{assign.staff.specialty}</div>
                    )}
                  </td>
                  <td style={{ color: '#ffffff' }}>{assign.service.name}</td>
                  <td>${assign.service.price}</td>
                  <td>
                    {assign.priceOverride !== null && assign.priceOverride !== undefined ? (
                      <span className={styles.overridePrice}>${assign.priceOverride} (Override)</span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>Default (${assign.service.price})</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm" onClick={() => handleEditClick(assign)}>Change Rate</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(assign.id)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Dialog */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modalContent}`}>
            <div className={styles.modalHeader}>
              <h3>{editingAssignment ? 'Update Specialty Rate' : 'Assign Service to Specialist'}</h3>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="staffSelect">Staff Member</label>
                <select
                  id="staffSelect"
                  className="input-field"
                  value={formData.staffId}
                  onChange={(e) => handleInputChange('staffId', e.target.value)}
                  disabled={!!editingAssignment}
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.specialty || 'Generalist'})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="serviceSelect">Service to Deliver</label>
                <select
                  id="serviceSelect"
                  className="input-field"
                  value={formData.serviceId}
                  onChange={(e) => handleInputChange('serviceId', e.target.value)}
                  disabled={!!editingAssignment}
                >
                  {services.map((svc) => (
                    <option key={svc.id} value={svc.id}>{svc.name} (${svc.price})</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                <input
                  id="useDefaultPrice"
                  type="checkbox"
                  checked={formData.useDefaultPrice}
                  onChange={(e) => handleInputChange('useDefaultPrice', e.target.checked)}
                />
                <label htmlFor="useDefaultPrice" className="form-label" style={{ marginBottom: 0 }}>Use Service's Default Booking Price</label>
              </div>

              {!formData.useDefaultPrice && (
                <div className="form-group">
                  <label className="form-label" htmlFor="priceOverrideInput">Custom Specialist Rate ($)</label>
                  <input
                    id="priceOverrideInput"
                    type="number"
                    step="0.01"
                    className="input-field"
                    value={formData.priceOverride}
                    onChange={(e) => handleInputChange('priceOverride', e.target.value)}
                    placeholder="e.g. 120.00"
                  />
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={submitting}>
                {submitting ? 'Saving...' : editingAssignment ? 'Save Rate Changes' : 'Confirm Assignment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

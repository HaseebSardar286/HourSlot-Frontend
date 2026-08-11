'use client';

import { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import styles from './staff.module.css';

interface Branch {
  id: number;
  name: string;
}

interface Staff {
  id: number;
  name: string;
  designation?: string;
  rating?: number;
  userId?: number | null;
  branch: {
    id: number;
    name: string;
  };
}

export default function StaffPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    designation: '',
    branchId: '',
    userId: '',
  });

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const branchData = await apiFetch<Branch[]>('/api/business/branches');
      setBranches(branchData);
      if (branchData.length > 0) {
        setSelectedBranchId(branchData[0].id.toString());
      }
    } catch (err: any) {
      setError(err?.message || 'Could not load directory data. Please ensure branches exist.');
    } finally {
      setLoading(false);
    }
  };

  const loadStaffForBranch = async (branchId: string) => {
    if (!branchId) return;
    setStaffLoading(true);
    try {
      const data = await apiFetch<Staff[]>(`/api/business/branches/${branchId}/staff`);
      setStaffList(data);
    } catch (err: any) {
      setError(err?.message || 'Could not load staff for branch.');
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      loadStaffForBranch(selectedBranchId);
    }
  }, [selectedBranchId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditClick = (staff: Staff) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      designation: staff.designation || '',
      branchId: staff.branch.id.toString(),
      userId: staff.userId ? staff.userId.toString() : '',
    });
    setShowForm(true);
  };

  const handleAddClick = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      designation: '',
      branchId: selectedBranchId,
      userId: '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.branchId) {
      setError('Staff name and branch are required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const payload = {
      name: formData.name,
      designation: formData.designation,
      branchId: parseInt(formData.branchId),
      userId: formData.userId ? parseInt(formData.userId) : null,
    };

    try {
      if (editingStaff) {
        // Edit Staff
        await apiFetch(`/api/business/staff/${editingStaff.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setMessage('Staff member details updated!');
      } else {
        // Add Staff
        await apiFetch('/api/business/staff', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setMessage('Staff member added successfully!');
      }
      setShowForm(false);
      // Reload active branch staff list
      await loadStaffForBranch(selectedBranchId);
    } catch (err: any) {
      setError(err?.message || 'Failed to save staff member details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this staff member? All their booking relationships will be unmapped.')) return;

    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/business/staff/${id}`, {
        method: 'DELETE',
      });
      setMessage('Staff member removed successfully.');
      await loadStaffForBranch(selectedBranchId);
    } catch (err: any) {
      setError(err?.message || 'Failed to remove staff member.');
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
    <div className={styles.staffContainer}>
      <div className={styles.headerRow}>
        <div className={styles.branchSelectArea}>
          <label className="form-label" htmlFor="branchFilter" style={{ marginBottom: 0, marginRight: '10px' }}>
            Select Branch:
          </label>
          <select
            id="branchFilter"
            className="input-field"
            style={{ width: '220px', padding: '6px 12px' }}
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <button className="btn btn-primary" onClick={handleAddClick} disabled={branches.length === 0}>
          <i className="fa-solid fa-plus"></i> Add Staff
        </button>
      </div>

      {message && <div className="success-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-circle-check"></i> {message}</div>}
      {error && <div className="error-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-triangle-exclamation"></i> {error}</div>}

      {branches.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📍</div>
          <h3>Branches Required</h3>
          <p style={{ color: 'var(--text-secondary)' }}>You must create at least one branch before listing staff members.</p>
        </div>
      ) : staffLoading ? (
        <div className={styles.loaderContainer}>
          <div className="spinner" />
        </div>
      ) : staffList.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>👥</div>
          <h3>No Staff Members at this Branch</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Add specialists to manage their working shifts and buffer hours.</p>
          <button className="btn btn-primary" onClick={handleAddClick}>Add Staff Member</button>
        </div>
      ) : (
        <div className={styles.staffGrid}>
          {staffList.map((staff) => (
            <div key={staff.id} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#ffffff' }}>{staff.name}</h3>
                    {staff.designation && <span className={styles.designationBadge}>{staff.designation}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className={styles.iconBtn} onClick={() => handleEditClick(staff)} title="Edit staff member">
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button className={`${styles.iconBtn} ${styles.deleteIconBtn}`} onClick={() => handleDelete(staff.id)} title="Delete staff member">
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>

                <div className={styles.infoBlock} style={{ marginTop: '16px' }}>
                  <div className={styles.infoLine}>
                    <i className="fa-solid fa-star" style={{ color: '#f59e0b' }}></i>
                    <span>Rating: {staff.rating ? staff.rating.toFixed(1) : 'No reviews'}</span>
                  </div>
                  {staff.userId && (
                    <div className={styles.infoLine}>
                      <i className="fa-solid fa-user-lock"></i>
                      <span>Linked User Account: ID {staff.userId}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {showForm && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modalContent}`}>
            <div className={styles.modalHeader}>
              <h3>{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
              <button className={styles.closeBtn} onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="staffName">Name</label>
                <input
                  id="staffName"
                  type="text"
                  className="input-field"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g. Sarah Connor"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="staffDesignation">Designation / Role Title</label>
                <input
                  id="staffDesignation"
                  type="text"
                  className="input-field"
                  value={formData.designation}
                  onChange={(e) => handleInputChange('designation', e.target.value)}
                  placeholder="e.g. Senior Hairstylist or Physiotherapist"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="staffBranch">Assigned Branch</label>
                <select
                  id="staffBranch"
                  className="input-field"
                  value={formData.branchId}
                  onChange={(e) => handleInputChange('branchId', e.target.value)}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="staffUserId">Linked User ID (Optional)</label>
                <input
                  id="staffUserId"
                  type="number"
                  className="input-field"
                  value={formData.userId}
                  onChange={(e) => handleInputChange('userId', e.target.value)}
                  placeholder="ID of user account for portal access"
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={submitting}>
                {submitting ? 'Saving...' : editingStaff ? 'Update Details' : 'Add Staff Member'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

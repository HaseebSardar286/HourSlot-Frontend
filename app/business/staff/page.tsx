'use client';

import { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import DataTable from '@/components/DataTable';
import FilterBar from '@/components/FilterBar';
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
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
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
        await apiFetch(`/api/business/staff/${editingStaff.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setMessage('Staff member details updated!');
      } else {
        await apiFetch('/api/business/staff', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setMessage('Staff member added successfully!');
      }
      setShowForm(false);
      await loadStaffForBranch(selectedBranchId);
    } catch (err: any) {
      setError(err?.message || 'Failed to save staff member details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    setDeleting(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/business/staff/${deleteId}`, { method: 'DELETE' });
      setMessage('Staff member removed successfully.');
      setDeleteId(null);
      await loadStaffForBranch(selectedBranchId);
    } catch (err: any) {
      setError(err?.message || 'Failed to remove staff member.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="title" />
        <Skeleton variant="row" count={4} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Staff"
        subtitle="Manage specialists by branch and optional portal account links."
        actions={
          <button type="button" className="btn btn-primary" onClick={handleAddClick} disabled={branches.length === 0}>
            <i className="fa-solid fa-plus" /> Add Staff
          </button>
        }
      />

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
          description="Create at least one branch before listing staff members."
          actionLabel="Add branch"
          onAction={() => {
            window.location.href = '/business/branches';
          }}
        />
      ) : (
        <>
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
          </FilterBar>

          {staffLoading ? (
            <Skeleton variant="row" count={4} />
          ) : staffList.length === 0 ? (
            <EmptyState
              icon="fa-users"
              title="No staff at this branch"
              description="Add specialists to manage their shifts and bookings."
              actionLabel="Add staff member"
              onAction={handleAddClick}
            />
          ) : (
            <DataTable
              columns={[
                {
                  key: 'name',
                  header: 'Name',
                  render: (s) => (
                    <div>
                      <strong>{s.name}</strong>
                      {s.designation && <div className={styles.desc}>{s.designation}</div>}
                    </div>
                  ),
                },
                {
                  key: 'rating',
                  header: 'Rating',
                  render: (s) => (s.rating ? s.rating.toFixed(1) : 'No reviews'),
                },
                {
                  key: 'user',
                  header: 'Linked user',
                  render: (s) => (s.userId ? `ID ${s.userId}` : '—'),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (s) => (
                    <div className={styles.actions}>
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => handleEditClick(s)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeleteId(s.id)}>
                        Delete
                      </button>
                    </div>
                  ),
                },
              ]}
              rows={staffList}
              rowKey={(s) => s.id}
            />
          )}
        </>
      )}

      <Modal
        open={showForm}
        title={editingStaff ? 'Edit staff member' : 'Add staff member'}
        onClose={() => setShowForm(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" form="staff-form" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingStaff ? 'Update details' : 'Add staff'}
            </button>
          </>
        }
      >
        <form id="staff-form" onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="staffName">
              Name
            </label>
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
            <label className="form-label" htmlFor="staffDesignation">
              Designation
            </label>
            <input
              id="staffDesignation"
              type="text"
              className="input-field"
              value={formData.designation}
              onChange={(e) => handleInputChange('designation', e.target.value)}
              placeholder="e.g. Senior Hairstylist"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="staffBranch">
              Assigned branch
            </label>
            <select
              id="staffBranch"
              className="select-field"
              value={formData.branchId}
              onChange={(e) => handleInputChange('branchId', e.target.value)}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="staffUserId">
              Linked user ID (optional)
            </label>
            <input
              id="staffUserId"
              type="number"
              className="input-field"
              value={formData.userId}
              onChange={(e) => handleInputChange('userId', e.target.value)}
              placeholder="Portal account user ID"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteId != null}
        title="Delete staff member"
        message="Delete this staff member? Booking relationships will be unmapped."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

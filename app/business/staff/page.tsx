'use client';

import { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import { useOwnerPlan } from '@/lib/owner-plan-context';
import { atLimit, limitHint } from '@/lib/plan';
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
  const { plan, loaded: planLoaded, refresh: refreshPlan } = useOwnerPlan();
  const canAdd = planLoaded && !atLimit(plan, 'staff', 'max_staff');
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
  const [inviteForm, setInviteForm] = useState({
    email: '',
    displayName: '',
    designation: '',
    branchId: '',
  });
  const [invites, setInvites] = useState<
    { id: number; email: string; displayName: string; status: string; branchName?: string }[]
  >([]);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [branchData, inviteData] = await Promise.all([
        apiFetch<Branch[]>('/api/business/branches'),
        apiFetch<{ id: number; email: string; displayName: string; status: string; branchName?: string }[]>(
          '/api/business/staff/invites'
        ).catch(() => []),
      ]);
      setBranches(branchData);
      setInvites(inviteData);
      if (branchData.length > 0) {
        setSelectedBranchId(branchData[0].id.toString());
        setInviteForm((p) => ({ ...p, branchId: branchData[0].id.toString() }));
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
      await refreshPlan();
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
      await refreshPlan();
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
        subtitle={
          canAdd
            ? 'Manage specialists by branch and optional portal account links.'
            : limitHint(plan, 'max_staff', 'staff members')
        }
        actions={
          canAdd ? (
            <button type="button" className="btn btn-primary" onClick={handleAddClick} disabled={branches.length === 0}>
              <i className="fa-solid fa-plus" /> Add Staff
            </button>
          ) : undefined
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

      {branches.length > 0 && canAdd && (
        <div className={`surface ${styles.inviteCard}`}>
          <h3>Invite staff by email</h3>
          <p className={styles.inviteHint}>Sends an accept link. Staff create their own login and join this branch.</p>
          <div className={styles.inviteGrid}>
            <input
              className="input-field"
              placeholder="Email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
            />
            <input
              className="input-field"
              placeholder="Display name"
              value={inviteForm.displayName}
              onChange={(e) => setInviteForm((p) => ({ ...p, displayName: e.target.value }))}
            />
            <input
              className="input-field"
              placeholder="Designation"
              value={inviteForm.designation}
              onChange={(e) => setInviteForm((p) => ({ ...p, designation: e.target.value }))}
            />
            <select
              className="select-field"
              value={inviteForm.branchId}
              onChange={(e) => setInviteForm((p) => ({ ...p, branchId: e.target.value }))}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primary"
              disabled={inviting}
              onClick={async () => {
                setInviting(true);
                setError(null);
                setInviteLink(null);
                try {
                  const res = await apiFetch<{
                    acceptPath: string;
                    inviteToken: string;
                  }>('/api/business/staff/invites', {
                    method: 'POST',
                    body: JSON.stringify({
                      email: inviteForm.email,
                      displayName: inviteForm.displayName,
                      designation: inviteForm.designation || null,
                      branchId: Number(inviteForm.branchId),
                    }),
                  });
                  const link = `${window.location.origin}${res.acceptPath}`;
                  setInviteLink(link);
                  setMessage('Invite created. Share the link with your staff member.');
                  setInviteForm((p) => ({ ...p, email: '', displayName: '', designation: '' }));
                  await loadInitialData();
                  await refreshPlan();
                } catch (err: any) {
                  setError(err?.message || 'Invite failed.');
                } finally {
                  setInviting(false);
                }
              }}
            >
              {inviting ? 'Creating…' : 'Create invite'}
            </button>
          </div>
          {inviteLink && (
            <p className={styles.inviteLink}>
              Invite link: <code>{inviteLink}</code>
            </p>
          )}
          {invites.length > 0 && (
            <ul className={styles.inviteList}>
              {invites.slice(0, 5).map((inv) => (
                <li key={inv.id}>
                  {inv.displayName} · {inv.email} · {inv.status}
                  {inv.branchName ? ` · ${inv.branchName}` : ''}
                </li>
              ))}
            </ul>
          )}
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
              icon={canAdd ? 'fa-users' : 'fa-lock'}
              title={canAdd ? 'No staff at this branch' : 'Staff limit reached'}
              description={
                canAdd
                  ? 'Add specialists to manage their shifts and bookings.'
                  : limitHint(plan, 'max_staff', 'staff members')
              }
              actionLabel={canAdd ? 'Add staff member' : undefined}
              onAction={canAdd ? handleAddClick : undefined}
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

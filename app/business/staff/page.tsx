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
import CustomSelect from '@/components/CustomSelect';
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

const getInitials = (name: string) => {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

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
  const [searchQuery, setSearchQuery] = useState('');

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

  // Calculate statistics
  const ratedStaff = staffList.filter((s) => s.rating != null && s.rating > 0);
  const avgRating =
    ratedStaff.length > 0
      ? (ratedStaff.reduce((acc, curr) => acc + (curr.rating || 0), 0) / ratedStaff.length).toFixed(1)
      : 'N/A';
  const pendingInvites = invites.filter((inv) => inv.status === 'PENDING').length;

  // Filter staff directory list
  const filteredStaff = staffList.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.designation && s.designation.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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

      {branches.length > 0 && (
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fa-solid fa-users" />
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{staffList.length}</div>
              <div className={styles.statLabel}>Team Specialists</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fa-solid fa-star" style={{ color: '#d97706' }} />
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{avgRating}</div>
              <div className={styles.statLabel}>Average Rating</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fa-solid fa-envelope-open-text" />
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{pendingInvites}</div>
              <div className={styles.statLabel}>Pending Invites</div>
            </div>
          </div>
        </div>
      )}

      {branches.length > 0 && canAdd && (
        <div className={styles.inviteCard}>
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
            <CustomSelect
              options={branches.map((b) => ({ value: b.id.toString(), label: b.name }))}
              value={inviteForm.branchId}
              onChange={(val) => setInviteForm((p) => ({ ...p, branchId: val }))}
              searchable={false}
              placeholder="Branch"
            />
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
              <i className="fa-solid fa-link" /> Invite link: <code>{inviteLink}</code>
            </p>
          )}
          {invites.length > 0 && (
            <div className={styles.inviteList}>
              {invites.slice(0, 6).map((inv) => (
                <div
                  key={inv.id}
                  className={`${styles.inviteChip} ${
                    inv.status === 'PENDING' ? styles.statusPending : styles.statusAccepted
                  }`}
                >
                  <i className={inv.status === 'PENDING' ? 'fa-regular fa-clock' : 'fa-solid fa-circle-check'} />
                  <span>
                    <strong>{inv.displayName}</strong> ({inv.email}) · {inv.status}
                    {inv.branchName ? ` @ ${inv.branchName}` : ''}
                  </span>
                </div>
              ))}
            </div>
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
          <div className={styles.searchBarContainer}>
            <FilterBar>
              <label className="form-label" htmlFor="branchFilter">
              Filter Branch:
            </label>
              <div style={{ minWidth: '180px' }}>
                <CustomSelect
                  id="branchFilter"
                  options={branches.map((b) => ({ value: b.id.toString(), label: b.name }))}
                  value={selectedBranchId}
                  onChange={setSelectedBranchId}
                  searchable={false}
                />
              </div>
            </FilterBar>

            <div className={styles.searchContainer}>
              <i className={`fa-solid fa-magnifying-glass ${styles.searchIcon}`} />
              <input
                type="text"
                className={`input-field ${styles.searchInput}`}
                placeholder="Search staff name or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {staffLoading ? (
            <Skeleton variant="row" count={4} />
          ) : filteredStaff.length === 0 ? (
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
            <div className={styles.staffGrid}>
              {filteredStaff.map((s) => (
                <div key={s.id} className={styles.staffCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.avatarCircle}>{getInitials(s.name)}</div>
                    <div className={styles.headerText}>
                      <h4 className={styles.staffName}>{s.name}</h4>
                      <span className={styles.staffDesignation}>{s.designation || 'Specialist'}</span>
                    </div>
                  </div>

                  <div className={styles.cardDetails}>
                    <div className={styles.detailItem}>
                      <i className="fa-solid fa-location-dot" />
                      <span>{s.branch.name}</span>
                    </div>
                    <div className={styles.detailItem}>
                      {s.userId ? (
                        <span className={styles.badgeLinked}>
                          <i className="fa-solid fa-circle-user" /> Linked Account
                        </span>
                      ) : (
                        <span className={styles.badgeOffline}>
                          <i className="fa-regular fa-circle" /> Offline Specialist
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.cardBottom}>
                    <div className={styles.ratingBadge}>
                      <i className="fa-solid fa-star" />
                      <span>{s.rating ? s.rating.toFixed(1) : 'New'}</span>
                    </div>
                    <div className={styles.actions}>
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => handleEditClick(s)}>
                        <i className="fa-regular fa-pen-to-square" style={{ marginRight: 4 }} /> Edit
                      </button>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeleteId(s.id)}>
                        <i className="fa-regular fa-trash-can" style={{ marginRight: 4 }} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
              Name:
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
              Designation:
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
              Assigned branch:
            </label>
            <CustomSelect
              id="staffBranch"
              options={branches.map((b) => ({ value: b.id.toString(), label: b.name }))}
              value={formData.branchId}
              onChange={(val) => handleInputChange('branchId', val)}
              searchable={false}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="staffUserId">
              Linked user ID (optional):
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

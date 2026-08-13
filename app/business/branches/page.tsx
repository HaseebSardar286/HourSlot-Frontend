'use client';

import { useState, useEffect, FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import DataTable from '@/components/DataTable';
import styles from './branches.module.css';

const LocationPicker = dynamic(
  () => import('@/components/LocationMap').then((m) => m.LocationPicker),
  { ssr: false, loading: () => <Skeleton variant="card" /> }
);

const LocationMap = dynamic(() => import('@/components/LocationMap'), {
  ssr: false,
  loading: () => <Skeleton variant="card" />,
});

interface Branch {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phoneNumber?: string;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: 37.7749,
    longitude: -122.4194,
    phoneNumber: '',
  });

  const loadBranches = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Branch[]>('/api/business/branches');
      setBranches(data);
    } catch (err: any) {
      setError(err?.message || 'Could not load branches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const handleEditClick = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address,
      latitude: branch.latitude || 37.7749,
      longitude: branch.longitude || -122.4194,
      phoneNumber: branch.phoneNumber || '',
    });
    setShowForm(true);
  };

  const handleAddClick = () => {
    setEditingBranch(null);
    setFormData({
      name: '',
      address: '',
      latitude: 37.7749,
      longitude: -122.4194,
      phoneNumber: '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.address.trim()) {
      setError('Name and address are required.');
      return;
    }
    if (!Number.isFinite(formData.latitude) || !Number.isFinite(formData.longitude)) {
      setError('Set a valid location on the map.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (editingBranch) {
        await apiFetch(`/api/business/branches/${editingBranch.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        setMessage('Branch updated successfully!');
      } else {
        await apiFetch('/api/business/branches', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        setMessage('Branch added successfully!');
      }
      setShowForm(false);
      await loadBranches();
    } catch (err: any) {
      setError(err?.message || 'Action failed. Please verify your profile is verified.');
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
      await apiFetch(`/api/business/branches/${deleteId}`, { method: 'DELETE' });
      setMessage('Branch deleted successfully.');
      setDeleteId(null);
      await loadBranches();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete branch.');
    } finally {
      setDeleting(false);
    }
  };

  const mapMarkers = branches
    .filter((b) => Number.isFinite(b.latitude) && Number.isFinite(b.longitude))
    .map((b) => ({
      id: b.id,
      lat: b.latitude,
      lng: b.longitude,
      label: `<strong>${b.name}</strong><br/>${b.address}`,
    }));

  return (
    <div className={styles.page}>
      <PageHeader
        title="Branches"
        subtitle="Manage locations on the map. Coordinates are stored as latitude and longitude."
        actions={
          <button type="button" className="btn btn-primary" onClick={handleAddClick}>
            <i className="fa-solid fa-plus" /> Add Branch
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

      {!loading && mapMarkers.length > 0 && (
        <div className={styles.mapPanel}>
          <LocationMap markers={mapMarkers} height={280} />
        </div>
      )}

      {loading ? (
        <Skeleton variant="row" count={4} />
      ) : branches.length === 0 ? (
        <EmptyState
          icon="fa-location-dot"
          title="No branches added"
          description="Add a branch and pin it on the map so customers can find you."
          actionLabel="Add your first branch"
          onAction={handleAddClick}
        />
      ) : (
        <DataTable
          columns={[
            { key: 'name', header: 'Branch', render: (b) => <strong>{b.name}</strong> },
            { key: 'address', header: 'Address', render: (b) => b.address },
            { key: 'phone', header: 'Phone', render: (b) => b.phoneNumber || '—' },
            {
              key: 'coords',
              header: 'Coordinates',
              render: (b) => (
                <span className={styles.coords}>
                  {Number(b.latitude).toFixed(4)}, {Number(b.longitude).toFixed(4)}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (b) => (
                <div className={styles.actions}>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => handleEditClick(b)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeleteId(b.id)}>
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
          rows={branches}
          rowKey={(b) => b.id}
        />
      )}

      <Modal
        open={showForm}
        title={editingBranch ? 'Edit branch' : 'Add new branch'}
        onClose={() => setShowForm(false)}
        wide
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" form="branch-form" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingBranch ? 'Update branch' : 'Add branch'}
            </button>
          </>
        }
      >
        <form id="branch-form" onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="branchName">
              Branch name
            </label>
            <input
              id="branchName"
              type="text"
              className="input-field"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Downtown Office"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="branchPhone">
              Phone number
            </label>
            <input
              id="branchPhone"
              type="text"
              className="input-field"
              value={formData.phoneNumber}
              onChange={(e) => setFormData((p) => ({ ...p, phoneNumber: e.target.value }))}
              placeholder="e.g. +1 (555) 019-2834"
            />
          </div>

          <LocationPicker
            address={formData.address}
            latitude={formData.latitude}
            longitude={formData.longitude}
            onAddressChange={(address) => setFormData((p) => ({ ...p, address }))}
            onCoordinatesChange={(latitude, longitude) =>
              setFormData((p) => ({ ...p, latitude, longitude }))
            }
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteId != null}
        title="Delete branch"
        message="Are you sure you want to delete this branch? Associated staff may be impacted."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

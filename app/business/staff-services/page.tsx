'use client';

import { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import DataTable from '@/components/DataTable';
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
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<StaffServiceAssignment | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
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

  const handleDelete = async () => {
    if (deleteId == null) return;
    setDeleting(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/business/staff-services/${deleteId}`, { method: 'DELETE' });
      setMessage('Assignment removed successfully.');
      setDeleteId(null);
      await loadInitialData();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete assignment.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Staff services"
        subtitle="Map services to staff and configure specialty price overrides."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAddClick}
            disabled={staffList.length === 0 || services.length === 0}
          >
            <i className="fa-solid fa-plus" /> Assign Service
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

      {loading ? (
        <Skeleton variant="row" count={4} />
      ) : staffList.length === 0 || services.length === 0 ? (
        <EmptyState
          icon="fa-handshake"
          title="Requirements missing"
          description="You need at least one staff member and one service to configure assignments."
        />
      ) : assignments.length === 0 ? (
        <EmptyState
          icon="fa-list"
          title="No assignments created"
          description="Assign services to staff members to allow customer bookings."
          actionLabel="Assign service"
          onAction={handleAddClick}
        />
      ) : (
        <DataTable
          columns={[
            {
              key: 'staff',
              header: 'Staff',
              render: (a) => (
                <div>
                  <strong>{a.staff.name}</strong>
                  {a.staff.specialty && <div className={styles.desc}>{a.staff.specialty}</div>}
                </div>
              ),
            },
            { key: 'service', header: 'Service', render: (a) => a.service.name },
            { key: 'default', header: 'Default rate', render: (a) => `$${a.service.price}` },
            {
              key: 'override',
              header: 'Assigned price',
              render: (a) =>
                a.priceOverride != null ? (
                  <span className={styles.override}>${a.priceOverride} (override)</span>
                ) : (
                  `Default ($${a.service.price})`
                ),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (a) => (
                <div className={styles.actions}>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => handleEditClick(a)}>
                    Change rate
                  </button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeleteId(a.id)}>
                    Remove
                  </button>
                </div>
              ),
            },
          ]}
          rows={assignments}
          rowKey={(a) => a.id}
        />
      )}

      <Modal
        open={showModal}
        title={editingAssignment ? 'Update specialty rate' : 'Assign service'}
        onClose={() => setShowModal(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" form="assign-form" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingAssignment ? 'Save changes' : 'Confirm assignment'}
            </button>
          </>
        }
      >
        <form id="assign-form" onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="staffSelect">
              Staff member
            </label>
            <select
              id="staffSelect"
              className="select-field"
              value={formData.staffId}
              onChange={(e) => handleInputChange('staffId', e.target.value)}
              disabled={!!editingAssignment}
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.specialty || 'Generalist'})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="serviceSelect">
              Service
            </label>
            <select
              id="serviceSelect"
              className="select-field"
              value={formData.serviceId}
              onChange={(e) => handleInputChange('serviceId', e.target.value)}
              disabled={!!editingAssignment}
            >
              {services.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.name} (${svc.price})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.checkRow}>
            <input
              id="useDefaultPrice"
              type="checkbox"
              checked={formData.useDefaultPrice}
              onChange={(e) => handleInputChange('useDefaultPrice', e.target.checked)}
            />
            <label htmlFor="useDefaultPrice" className="form-label">
              Use service default price
            </label>
          </div>
          {!formData.useDefaultPrice && (
            <div className="form-group">
              <label className="form-label" htmlFor="priceOverrideInput">
                Custom specialist rate ($)
              </label>
              <input
                id="priceOverrideInput"
                type="number"
                step="0.01"
                className="input-field"
                value={formData.priceOverride}
                onChange={(e) => handleInputChange('priceOverride', e.target.value)}
              />
            </div>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteId != null}
        title="Remove assignment"
        message="Remove this service assignment?"
        confirmLabel="Remove"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

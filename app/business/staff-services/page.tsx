'use client';

import { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import DataTable from '@/components/DataTable';
import CustomSelect from '@/components/CustomSelect';
import { formatMoney } from '@/lib/money';
import styles from './staff-services.module.css';

interface Staff {
  id: number;
  name?: string;
  displayName?: string;
  specialty?: string;
}

interface Service {
  id: number;
  name: string;
  price: number;
  currency?: string;
}

interface StaffServiceAssignment {
  id: number;
  staff: Staff;
  service: Service;
  priceOverride?: number | null;
}

function staffLabel(staff?: Staff | null) {
  return staff?.name || staff?.displayName || 'Unknown staff';
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
    const staff = resolveStaff(assign);
    const service = resolveService(assign);
    setEditingAssignment(assign);
    setFormData({
      staffId: staff?.id?.toString() || '',
      serviceId: service?.id?.toString() || '',
      priceOverride: assign.priceOverride != null ? String(assign.priceOverride) : '',
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

  const resolveStaff = (assign: StaffServiceAssignment) => {
    const nested = assign.staff;
    if (nested?.name || nested?.displayName) {
      return nested;
    }
    return staffList.find((s) => s.id === nested?.id) || nested;
  };

  const resolveService = (assign: StaffServiceAssignment) => {
    const nested = assign.service;
    if (nested?.name) {
      return nested;
    }
    return services.find((s) => s.id === nested?.id) || nested;
  };

  const money = (amount: number | null | undefined, code?: string) =>
    formatMoney(amount, code);

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
              render: (a) => {
                const staff = resolveStaff(a);
                return (
                  <div>
                    <strong>{staffLabel(staff)}</strong>
                    {staff?.specialty && <div className={styles.desc}>{staff.specialty}</div>}
                  </div>
                );
              },
            },
            {
              key: 'service',
              header: 'Service',
              render: (a) => resolveService(a)?.name || 'Unknown service',
            },
            {
              key: 'default',
              header: 'Default rate',
              render: (a) => {
                const service = resolveService(a);
                return money(service?.price, service?.currency);
              },
            },
            {
              key: 'override',
              header: 'Assigned rate',
              render: (a) => {
                const service = resolveService(a);
                if (a.priceOverride != null) {
                  return (
                    <span className={styles.override}>
                      {money(a.priceOverride, service?.currency)} (override)
                    </span>
                  );
                }
                return `Default (${money(service?.price, service?.currency)})`;
              },
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
            <CustomSelect
              id="staffSelect"
              options={staffList.map((s) => ({
                value: String(s.id),
                label: staffLabel(s),
                sublabel: s.specialty || 'Generalist',
              }))}
              value={String(formData.staffId || '')}
              onChange={(value) => handleInputChange('staffId', value)}
              placeholder="Select staff member"
              disabled={!!editingAssignment}
              searchable={staffList.length > 6}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="serviceSelect">
              Service
            </label>
            <CustomSelect
              id="serviceSelect"
              options={services.map((svc) => ({
                value: String(svc.id),
                label: svc.name,
                sublabel: money(svc.price, svc.currency),
              }))}
              value={String(formData.serviceId || '')}
              onChange={(value) => handleInputChange('serviceId', value)}
              placeholder="Select service"
              disabled={!!editingAssignment}
              searchable={services.length > 6}
            />
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
              Custom specialist rate
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

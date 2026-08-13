'use client';

import { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import styles from './packages.module.css';

interface Service {
  id: number;
  name: string;
  price: number;
}

interface ServicePackage {
  id: number;
  name: string;
  description?: string;
  price: number;
  sessionsCount: number;
  expiryDays: number;
  active: boolean;
  services?: Service[];
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    sessionsCount: '5',
    expiryDays: '90',
    active: true,
    serviceIds: [] as number[],
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pkgsData, svcsData] = await Promise.all([
        apiFetch<ServicePackage[]>('/api/business/packages'),
        apiFetch<Service[]>('/api/business/services'),
      ]);
      setPackages(pkgsData);
      setServices(svcsData);
    } catch (err: any) {
      setError(err?.message || 'Could not load data. Ensure services have been added.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleServiceCheckboxChange = (serviceId: number) => {
    setFormData((prev) => {
      const current = prev.serviceIds;
      const updated = current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId];
      return { ...prev, serviceIds: updated };
    });
  };

  const handleAddClick = () => {
    setEditingPackage(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      sessionsCount: '5',
      expiryDays: '90',
      active: true,
      serviceIds: [],
    });
    setShowModal(true);
  };

  const handleEditClick = (pkg: ServicePackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      price: pkg.price.toString(),
      sessionsCount: pkg.sessionsCount.toString(),
      expiryDays: pkg.expiryDays ? pkg.expiryDays.toString() : '0',
      active: pkg.active,
      serviceIds: pkg.services ? pkg.services.map((s) => s.id) : [],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price || !formData.sessionsCount) {
      setError('Please fill in all required fields.');
      return;
    }
    if (formData.serviceIds.length === 0) {
      setError('Please select at least one service to include in the package.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const payload = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      sessionsCount: parseInt(formData.sessionsCount),
      expiryDays: parseInt(formData.expiryDays) || 0,
      active: formData.active,
      serviceIds: formData.serviceIds,
    };

    try {
      if (editingPackage) {
        await apiFetch(`/api/business/packages/${editingPackage.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setMessage('Service package updated!');
      } else {
        await apiFetch('/api/business/packages', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setMessage('Service package created successfully!');
      }
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save package.');
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
      await apiFetch(`/api/business/packages/${deleteId}`, { method: 'DELETE' });
      setMessage('Package deleted.');
      setDeleteId(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Delete operation failed.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Packages"
        subtitle="Create session bundles and combo deals for repeat customers."
        actions={
          <button type="button" className="btn btn-primary" onClick={handleAddClick}>
            <i className="fa-solid fa-plus" /> Create Package
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
      ) : packages.length === 0 ? (
        <EmptyState
          icon="fa-box-open"
          title="No packages available"
          description="Create combo deals for repeat customer bookings."
          actionLabel="Create package"
          onAction={handleAddClick}
        />
      ) : (
        <DataTable
          columns={[
            {
              key: 'name',
              header: 'Package',
              render: (pkg) => (
                <div>
                  <strong>{pkg.name}</strong>
                  {pkg.description && <div className={styles.desc}>{pkg.description}</div>}
                </div>
              ),
            },
            { key: 'price', header: 'Price', render: (pkg) => `$${pkg.price}` },
            { key: 'sessions', header: 'Sessions', render: (pkg) => pkg.sessionsCount },
            {
              key: 'expiry',
              header: 'Expiry',
              render: (pkg) => (pkg.expiryDays > 0 ? `${pkg.expiryDays} days` : 'No expiry'),
            },
            {
              key: 'status',
              header: 'Status',
              render: (pkg) => <StatusBadge status={pkg.active ? 'ACTIVE' : 'SUSPENDED'} />,
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (pkg) => (
                <div className={styles.actions}>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => handleEditClick(pkg)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeleteId(pkg.id)}>
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
          rows={packages}
          rowKey={(pkg) => pkg.id}
        />
      )}

      <Modal
        open={showModal}
        title={editingPackage ? 'Edit package' : 'Create package'}
        onClose={() => setShowModal(false)}
        wide
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              form="package-form"
              className="btn btn-primary"
              disabled={submitting || services.length === 0}
            >
              {submitting ? 'Saving...' : editingPackage ? 'Update package' : 'Create package'}
            </button>
          </>
        }
      >
        <form id="package-form" onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="pkgNameInput">
              Package name
            </label>
            <input
              id="pkgNameInput"
              type="text"
              className="input-field"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g. 5x Whitening Bundle"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="pkgDescInput">
              Description
            </label>
            <textarea
              id="pkgDescInput"
              className={`input-field ${styles.textarea}`}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what's included..."
            />
          </div>
          <div className={styles.twoCol}>
            <div className="form-group">
              <label className="form-label" htmlFor="pkgPriceInput">
                Bundle price ($)
              </label>
              <input
                id="pkgPriceInput"
                type="number"
                step="0.01"
                className="input-field"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="pkgSessionsInput">
                Sessions count
              </label>
              <input
                id="pkgSessionsInput"
                type="number"
                className="input-field"
                value={formData.sessionsCount}
                onChange={(e) => handleInputChange('sessionsCount', e.target.value)}
              />
            </div>
          </div>
          <div className={styles.twoCol}>
            <div className="form-group">
              <label className="form-label" htmlFor="pkgExpiryInput">
                Expiry (days)
              </label>
              <input
                id="pkgExpiryInput"
                type="number"
                className="input-field"
                value={formData.expiryDays}
                onChange={(e) => handleInputChange('expiryDays', e.target.value)}
              />
            </div>
            <div className={`form-group ${styles.checkRow}`}>
              <input
                id="pkgActiveInput"
                type="checkbox"
                checked={formData.active}
                onChange={(e) => handleInputChange('active', e.target.checked)}
              />
              <label htmlFor="pkgActiveInput" className="form-label">
                Active
              </label>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Include services</label>
            {services.length === 0 ? (
              <p className={styles.warn}>Create services first before creating packages.</p>
            ) : (
              <div className={styles.checkboxList}>
                {services.map((svc) => (
                  <label key={svc.id} className={styles.checkboxItem}>
                    <input
                      type="checkbox"
                      checked={formData.serviceIds.includes(svc.id)}
                      onChange={() => handleServiceCheckboxChange(svc.id)}
                    />
                    <span>
                      {svc.name} (${svc.price})
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteId != null}
        title="Delete package"
        message="Are you sure you want to delete this package?"
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

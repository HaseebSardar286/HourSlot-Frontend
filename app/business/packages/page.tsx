'use client';

import { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import { useOwnerPlan } from '@/lib/owner-plan-context';
import { hasFeature, upgradeHint } from '@/lib/plan';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { useOrgLocale } from '@/lib/org-locale-context';
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
  const { format, currency } = useOrgLocale();
  const { plan, loaded: planLoaded } = useOwnerPlan();
  const canManage = planLoaded && hasFeature(plan, 'packages');
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
  const [searchQuery, setSearchQuery] = useState('');
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

  // Calculate statistics
  const totalBundles = packages.length;
  const avgBundlePrice =
    packages.length > 0
      ? (packages.reduce((acc, curr) => acc + curr.price, 0) / packages.length).toFixed(2)
      : '0.00';
  const activeBundles = packages.filter((p) => p.active).length;

  // Filter packages list
  const filteredPackages = packages.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={styles.page}>
      <PageHeader
        title="Packages"
        subtitle={
          canManage
            ? 'Create session bundles and combo deals for repeat customers.'
            : upgradeHint(plan, 'packages', 'session packages')
        }
        actions={
          canManage ? (
            <button type="button" className="btn btn-primary" onClick={handleAddClick}>
              <i className="fa-solid fa-plus" /> Create Package
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

      {packages.length > 0 && (
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fa-solid fa-box-open" />
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{totalBundles}</div>
              <div className={styles.statLabel}>Bundle Offers</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fa-solid fa-dollar-sign" />
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{format(Number(avgBundlePrice))}</div>
              <div className={styles.statLabel}>Average Price</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fa-solid fa-circle-check" style={{ color: '#059669' }} />
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{activeBundles}</div>
              <div className={styles.statLabel}>Active Bundles</div>
            </div>
          </div>
        </div>
      )}

      {packages.length > 0 && (
        <div className={styles.searchBarContainer}>
          <div className={styles.searchContainer}>
            <i className={`fa-solid fa-magnifying-glass ${styles.searchIcon}`} />
            <input
              type="text"
              className={`input-field ${styles.searchInput}`}
              placeholder="Search bundle name or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {loading ? (
        <Skeleton variant="row" count={4} />
      ) : packages.length === 0 ? (
        <EmptyState
          icon={canManage ? 'fa-box-open' : 'fa-lock'}
          title={canManage ? 'No packages available' : 'Packages are a paid feature'}
          description={
            canManage
              ? 'Create combo deals for repeat customer bookings.'
              : upgradeHint(plan, 'packages', 'session packages')
          }
          actionLabel={canManage ? 'Create package' : undefined}
          onAction={canManage ? handleAddClick : undefined}
        />
      ) : (
        <div className={styles.packagesGrid}>
          {filteredPackages.map((pkg) => (
            <div key={pkg.id} className={styles.packageCard}>
              <div className={styles.cardHeader}>
                <h4 className={styles.packageName}>{pkg.name}</h4>
                <span className={pkg.active ? styles.badgeActive : styles.badgeSuspended}>
                  {pkg.active ? 'ACTIVE' : 'SUSPENDED'}
                </span>
              </div>

              <p className={styles.descText}>{pkg.description || 'No description provided.'}</p>

              <div className={styles.cardDetails}>
                <div className={styles.detailItem}>
                  <i className="fa-solid fa-bolt" />
                  <span>Sessions: {pkg.sessionsCount} sessions included</span>
                </div>
                <div className={styles.detailItem}>
                  <i className="fa-regular fa-calendar" />
                  <span>Validity: {pkg.expiryDays > 0 ? `${pkg.expiryDays} days` : 'Lifetime validity'}</span>
                </div>
                {pkg.services && pkg.services.length > 0 && (
                  <div className={styles.detailItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Included services:</span>
                    <div className={styles.serviceTags}>
                      {pkg.services.map((svc) => (
                        <span key={svc.id} className={styles.serviceTag}>
                          {svc.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.cardBottom}>
                <span className={styles.priceBadge}>{format(pkg.price)}</span>
                <div className={styles.actions}>
                  {canManage && (
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => handleEditClick(pkg)}>
                      <i className="fa-regular fa-pen-to-square" style={{ marginRight: 4 }} /> Edit
                    </button>
                  )}
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeleteId(pkg.id)}>
                    <i className="fa-regular fa-trash-can" style={{ marginRight: 4 }} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredPackages.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '2rem', marginBottom: 12 }} />
              <p>No package bundles match your search query.</p>
            </div>
          )}
        </div>
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
              Package name:
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
              Description:
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
                Bundle price ({currency}):
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
              Sessions count:
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
              Expiry (days):
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
              Active catalog bundle
            </label>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">
              Include services:
            </label>
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
                      {svc.name} ({format(svc.price)})
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

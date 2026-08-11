'use client';

import { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
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

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);
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

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/business/packages/${id}`, {
        method: 'DELETE',
      });
      setMessage('Package deleted.');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Delete operation failed.');
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
    <div className={styles.packagesContainer}>
      <div className={styles.headerRow}>
        <p style={{ color: 'var(--text-secondary)' }}>
          Create service packages and combos with promotional discounts.
        </p>
        <button className="btn btn-primary" onClick={handleAddClick}>
          <i className="fa-solid fa-plus"></i> Create Package
        </button>
      </div>

      {message && <div className="success-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-circle-check"></i> {message}</div>}
      {error && <div className="error-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-triangle-exclamation"></i> {error}</div>}

      {packages.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎁</div>
          <h3>No Packages Available</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Create combo deals for repeat customer bookings.</p>
          <button className="btn btn-primary" onClick={handleAddClick}>Create Package</button>
        </div>
      ) : (
        <div className={styles.packagesGrid}>
          {packages.map((pkg) => (
            <div key={pkg.id} className={`${styles.packageCard} ${!pkg.active ? styles.inactiveCard : ''}`}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.pkgName}>{pkg.name}</h3>
                  <span className={styles.sessionsBadge}>{pkg.sessionsCount} Sessions</span>
                </div>
                <div className={styles.pkgPrice}>${pkg.price}</div>
              </div>

              {pkg.description && <p className={styles.pkgDesc}>{pkg.description}</p>}

              <div className={styles.servicesBundled}>
                <h4>Bundled Services:</h4>
                <div className={styles.servicesBadgesList}>
                  {pkg.services && pkg.services.map((s) => (
                    <span key={s.id} className={styles.serviceBadge}>{s.name}</span>
                  ))}
                </div>
              </div>

              <div className={styles.cardFooter}>
                <span className={styles.expiryInfo}>
                  <i className="fa-solid fa-clock-rotate-left"></i> {pkg.expiryDays > 0 ? `Expires in ${pkg.expiryDays} days` : 'No Expiry'}
                </span>
                <div className={styles.cardActions}>
                  <button className="btn btn-sm" onClick={() => handleEditClick(pkg)}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(pkg.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Package Form Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modalContent}`}>
            <div className={styles.modalHeader}>
              <h3>{editingPackage ? 'Edit Package Combo' : 'Create Package Combo'}</h3>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="pkgNameInput">Package Name</label>
                <input
                  id="pkgNameInput"
                  type="text"
                  className="input-field"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g. 5x Whitening Treatment Bundle"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="pkgDescInput">Description (Optional)</label>
                <textarea
                  id="pkgDescInput"
                  className="input-field"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe what's included and any bundle benefits..."
                  style={{ minHeight: '60px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="pkgPriceInput">Bundle Price ($)</label>
                  <input
                    id="pkgPriceInput"
                    type="number"
                    step="0.01"
                    className="input-field"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="e.g. 199.99"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="pkgSessionsInput">Sessions Count</label>
                  <input
                    id="pkgSessionsInput"
                    type="number"
                    className="input-field"
                    value={formData.sessionsCount}
                    onChange={(e) => handleInputChange('sessionsCount', e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="pkgExpiryInput">Expiry Period (Days)</label>
                  <input
                    id="pkgExpiryInput"
                    type="number"
                    className="input-field"
                    value={formData.expiryDays}
                    onChange={(e) => handleInputChange('expiryDays', e.target.value)}
                    placeholder="e.g. 90 (0 for no expiry)"
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '28px' }}>
                  <input
                    id="pkgActiveInput"
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => handleInputChange('active', e.target.checked)}
                  />
                  <label htmlFor="pkgActiveInput" className="form-label" style={{ marginBottom: 0 }}>Active</label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Include Services in Bundle</label>
                {services.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: '#ef4444', marginTop: '4px' }}>
                    Create services first under the Services Catalog tab before creating combos.
                  </p>
                ) : (
                  <div className={styles.servicesCheckboxList}>
                    {services.map((svc) => (
                      <label key={svc.id} className={styles.serviceCheckboxItem}>
                        <input
                          type="checkbox"
                          checked={formData.serviceIds.includes(svc.id)}
                          onChange={() => handleServiceCheckboxChange(svc.id)}
                        />
                        <span>{svc.name} (${svc.price})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={submitting || services.length === 0}>
                {submitting ? 'Saving...' : editingPackage ? 'Update Combo Package' : 'Create Combo Package'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

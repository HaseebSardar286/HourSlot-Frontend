'use client';

import { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import styles from './branches.module.css';

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

  // Modal / Form state
  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (editingBranch) {
        // Edit Branch
        await apiFetch(`/api/business/branches/${editingBranch.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        setMessage('Branch updated successfully!');
      } else {
        // Add Branch
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

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this branch? All associated staff will be impacted.')) return;

    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/business/branches/${id}`, {
        method: 'DELETE',
      });
      setMessage('Branch deleted successfully.');
      await loadBranches();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete branch.');
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
    <div className={styles.branchesContainer}>
      <div className={styles.headerRow}>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your corporate branches and geographical coordination points.</p>
        <button className="btn btn-primary" onClick={handleAddClick}>
          <i className="fa-solid fa-plus"></i> Add Branch
        </button>
      </div>

      {message && <div className="success-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-circle-check"></i> {message}</div>}
      {error && <div className="error-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-triangle-exclamation"></i> {error}</div>}

      {/* Grid listing */}
      {branches.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📍</div>
          <h3>No Branches Added</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>List your business branches here to start scheduling.</p>
          <button className="btn btn-primary" onClick={handleAddClick}>Add Your First Branch</button>
        </div>
      ) : (
        <div className={styles.branchesGrid}>
          {branches.map((branch) => (
            <div key={branch.id} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#ffffff' }}>{branch.name}</h3>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className={styles.iconBtn} onClick={() => handleEditClick(branch)} title="Edit branch">
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button className={`${styles.iconBtn} ${styles.deleteIconBtn}`} onClick={() => handleDelete(branch.id)} title="Delete branch">
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
                <div className={styles.infoLine}>
                  <i className="fa-solid fa-map-location-dot"></i>
                  <span>{branch.address}</span>
                </div>
                {branch.phoneNumber && (
                  <div className={styles.infoLine}>
                    <i className="fa-solid fa-phone"></i>
                    <span>{branch.phoneNumber}</span>
                  </div>
                )}
              </div>
              <div className={styles.coordinateBadge}>
                <i className="fa-solid fa-location-crosshairs"></i> {branch.latitude.toFixed(4)}, {branch.longitude.toFixed(4)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-over or modal form */}
      {showForm && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modalContent}`}>
            <div className={styles.modalHeader}>
              <h3>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</h3>
              <button className={styles.closeBtn} onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="branchName">Branch Name</label>
                <input
                  id="branchName"
                  type="text"
                  className="input-field"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g. Downtown Office"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="branchAddress">Address</label>
                <input
                  id="branchAddress"
                  type="text"
                  className="input-field"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="e.g. 123 Main St, New York"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="branchPhone">Phone Number</label>
                <input
                  id="branchPhone"
                  type="text"
                  className="input-field"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  placeholder="e.g. +1 (555) 019-2834"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="branchLat">Latitude</label>
                  <input
                    id="branchLat"
                    type="number"
                    step="0.000001"
                    className="input-field"
                    value={formData.latitude}
                    onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="branchLng">Longitude</label>
                  <input
                    id="branchLng"
                    type="number"
                    step="0.000001"
                    className="input-field"
                    value={formData.longitude}
                    onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={submitting}>
                {submitting ? 'Saving...' : editingBranch ? 'Update Branch' : 'Add Branch'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

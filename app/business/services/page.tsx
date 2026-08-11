'use client';

import { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import styles from './services.module.css';

interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  bufferMinutes: number;
  maxConcurrent: number;
  active: boolean;
  capacity: number;
  groupService: boolean;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    durationMinutes: 30,
    bufferMinutes: 0,
    maxConcurrent: 1,
    active: true,
    capacity: 1,
    groupService: false,
  });

  const loadServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Service[]>('/api/business/services');
      setServices(data);
    } catch (err: any) {
      setError(err?.message || 'Could not load services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditClick = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price,
      durationMinutes: service.durationMinutes,
      bufferMinutes: service.bufferMinutes || 0,
      maxConcurrent: service.maxConcurrent || 1,
      active: service.active !== undefined ? service.active : true,
      capacity: service.capacity || 1,
      groupService: service.groupService || false,
    });
    setShowForm(true);
  };

  const handleAddClick = () => {
    setEditingService(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      durationMinutes: 30,
      bufferMinutes: 0,
      maxConcurrent: 1,
      active: true,
      capacity: 1,
      groupService: false,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Service name is required.');
      return;
    }
    if (formData.price < 0 || formData.durationMinutes < 1) {
      setError('Invalid price or duration values.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (editingService) {
        // Edit Service
        await apiFetch(`/api/business/services/${editingService.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        setMessage('Service updated successfully!');
      } else {
        // Add Service
        await apiFetch('/api/business/services', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        setMessage('Service added successfully!');
      }
      setShowForm(false);
      await loadServices();
    } catch (err: any) {
      setError(err?.message || 'Failed to save service.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this service from your catalog?')) return;

    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/business/services/${id}`, {
        method: 'DELETE',
      });
      setMessage('Service removed successfully.');
      await loadServices();
    } catch (err: any) {
      setError(err?.message || 'Failed to remove service.');
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
    <div className={styles.servicesContainer}>
      <div className={styles.headerRow}>
        <p style={{ color: 'var(--text-secondary)' }}>Manage the service portfolio and catalog prices of your business.</p>
        <button className="btn btn-primary" onClick={handleAddClick}>
          <i className="fa-solid fa-plus"></i> Add Service
        </button>
      </div>

      {message && <div className="success-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-circle-check"></i> {message}</div>}
      {error && <div className="error-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-triangle-exclamation"></i> {error}</div>}

      {services.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏷️</div>
          <h3>Empty Service Catalog</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Add services to list them on booking marketplace screens.</p>
          <button className="btn btn-primary" onClick={handleAddClick}>Add Your First Service</button>
        </div>
      ) : (
        <div className={styles.servicesGrid}>
          {services.map((service) => (
            <div key={service.id} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#ffffff' }}>{service.name}</h3>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className={styles.iconBtn} onClick={() => handleEditClick(service)} title="Edit service">
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button className={`${styles.iconBtn} ${styles.deleteIconBtn}`} onClick={() => handleDelete(service.id)} title="Delete service">
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
                {service.description && (
                  <p className={styles.serviceDesc}>{service.description}</p>
                )}
              </div>
              <div className={styles.badgesRow}>
                <span className={styles.priceBadge}>
                  <i className="fa-solid fa-dollar-sign"></i> {service.price.toFixed(2)}
                </span>
                <span className={styles.durationBadge}>
                  <i className="fa-solid fa-clock"></i> {service.durationMinutes} min
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {showForm && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modalContent}`}>
            <div className={styles.modalHeader}>
              <h3>{editingService ? 'Edit Service Details' : 'Create New Service'}</h3>
              <button className={styles.closeBtn} onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="serviceName">Service Name</label>
                <input
                  id="serviceName"
                  type="text"
                  className="input-field"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g. Teeth Whitening or Haircut"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="serviceDesc">Description</label>
                <textarea
                  id="serviceDesc"
                  className="input-field"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe what the service includes..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="servicePrice">Price ($)</label>
                  <input
                    id="servicePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    className="input-field"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="serviceDuration">Duration (min)</label>
                  <input
                    id="serviceDuration"
                    type="number"
                    min="1"
                    className="input-field"
                    value={formData.durationMinutes}
                    onChange={(e) => handleInputChange('durationMinutes', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={submitting}>
                {submitting ? 'Saving...' : editingService ? 'Update Service' : 'Add Service'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

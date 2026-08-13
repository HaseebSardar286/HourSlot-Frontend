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
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleInputChange = (field: string, value: string | number | boolean) => {
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
        await apiFetch(`/api/business/services/${editingService.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        setMessage('Service updated successfully!');
      } else {
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

  const handleDelete = async () => {
    if (deleteId == null) return;
    setDeleting(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/business/services/${deleteId}`, { method: 'DELETE' });
      setMessage('Service removed successfully.');
      setDeleteId(null);
      await loadServices();
    } catch (err: any) {
      setError(err?.message || 'Failed to remove service.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Services"
        subtitle="Manage your catalog prices, durations, and bookable offerings."
        actions={
          <button type="button" className="btn btn-primary" onClick={handleAddClick}>
            <i className="fa-solid fa-plus" /> Add Service
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
      ) : services.length === 0 ? (
        <EmptyState
          icon="fa-tags"
          title="Empty service catalog"
          description="Add services to list them on booking marketplace screens."
          actionLabel="Add your first service"
          onAction={handleAddClick}
        />
      ) : (
        <DataTable
          columns={[
            {
              key: 'name',
              header: 'Service',
              render: (s) => (
                <div>
                  <strong>{s.name}</strong>
                  {s.description && <div className={styles.desc}>{s.description}</div>}
                </div>
              ),
            },
            { key: 'price', header: 'Price', render: (s) => `$${s.price.toFixed(2)}` },
            { key: 'duration', header: 'Duration', render: (s) => `${s.durationMinutes} min` },
            {
              key: 'status',
              header: 'Status',
              render: (s) => <StatusBadge status={s.active ? 'ACTIVE' : 'SUSPENDED'} />,
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
          rows={services}
          rowKey={(s) => s.id}
        />
      )}

      <Modal
        open={showForm}
        title={editingService ? 'Edit service' : 'Create service'}
        onClose={() => setShowForm(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" form="service-form" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingService ? 'Update service' : 'Add service'}
            </button>
          </>
        }
      >
        <form id="service-form" onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="serviceName">
              Service name
            </label>
            <input
              id="serviceName"
              type="text"
              className="input-field"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g. Teeth Whitening"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="serviceDesc">
              Description
            </label>
            <textarea
              id="serviceDesc"
              className={`input-field ${styles.textarea}`}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what the service includes..."
            />
          </div>
          <div className={styles.twoCol}>
            <div className="form-group">
              <label className="form-label" htmlFor="servicePrice">
                Price ($)
              </label>
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
              <label className="form-label" htmlFor="serviceDuration">
                Duration (min)
              </label>
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
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteId != null}
        title="Delete service"
        message="Are you sure you want to delete this service from your catalog?"
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

'use client';

import { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import DataTable from '@/components/DataTable';
import styles from './peak-pricing.module.css';

interface Service {
  id: number;
  name: string;
  price: number;
}

interface TimeOfDayPricing {
  id: number;
  service: Service;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  priceMultiplier: number;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

export default function PeakPricingPage() {
  const [rules, setRules] = useState<TimeOfDayPricing[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<TimeOfDayPricing | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    serviceId: '',
    dayOfWeek: 6,
    startTime: '09:00',
    endTime: '17:00',
    priceMultiplier: '1.2',
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rulesData, svcsData] = await Promise.all([
        apiFetch<TimeOfDayPricing[]>('/api/business/time-pricing'),
        apiFetch<Service[]>('/api/business/services'),
      ]);
      setRules(rulesData);
      setServices(svcsData);
    } catch (err: any) {
      setError(err?.message || 'Could not load peak pricing rules.');
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

  const handleAddClick = () => {
    setEditingRule(null);
    setFormData({
      serviceId: services.length > 0 ? services[0].id.toString() : '',
      dayOfWeek: 6,
      startTime: '09:00',
      endTime: '17:00',
      priceMultiplier: '1.2',
    });
    setShowModal(true);
  };

  const handleEditClick = (rule: TimeOfDayPricing) => {
    setEditingRule(rule);
    setFormData({
      serviceId: rule.service.id.toString(),
      dayOfWeek: rule.dayOfWeek,
      startTime: rule.startTime.slice(0, 5),
      endTime: rule.endTime.slice(0, 5),
      priceMultiplier: rule.priceMultiplier.toString(),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.serviceId || !formData.startTime || !formData.endTime || !formData.priceMultiplier) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const payload = {
      serviceId: parseInt(formData.serviceId),
      dayOfWeek: formData.dayOfWeek,
      startTime: formData.startTime,
      endTime: formData.endTime,
      priceMultiplier: parseFloat(formData.priceMultiplier),
    };

    try {
      if (editingRule) {
        await apiFetch(`/api/business/time-pricing/${editingRule.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setMessage('Peak pricing override updated!');
      } else {
        await apiFetch('/api/business/time-pricing', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setMessage('Peak pricing rule saved successfully!');
      }
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save peak pricing rule.');
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
      await apiFetch(`/api/business/time-pricing/${deleteId}`, { method: 'DELETE' });
      setMessage('Peak pricing rule deleted.');
      setDeleteId(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Deactivation failed.');
    } finally {
      setDeleting(false);
    }
  };

  const getDayName = (dayVal: number) => DAYS_OF_WEEK.find((d) => d.value === dayVal)?.label || 'Everyday';

  return (
    <div className={styles.page}>
      <PageHeader
        title="Peak pricing"
        subtitle="Configure day-of-week and time-of-day demand multipliers."
        actions={
          <button type="button" className="btn btn-primary" onClick={handleAddClick} disabled={services.length === 0}>
            <i className="fa-solid fa-plus" /> Configure Peak Rate
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
          title="Services required"
          description="Create services first before defining peak rates."
          actionLabel="Go to services"
          onAction={() => {
            window.location.href = '/business/services';
          }}
        />
      ) : rules.length === 0 ? (
        <EmptyState
          icon="fa-bolt"
          title="No peak pricing configured"
          description="Charge multipliers on premium slots such as weekend afternoons."
          actionLabel="Configure peak rate"
          onAction={handleAddClick}
        />
      ) : (
        <DataTable
          columns={[
            { key: 'service', header: 'Service', render: (r) => <strong>{r.service.name}</strong> },
            { key: 'day', header: 'Day', render: (r) => getDayName(r.dayOfWeek) },
            {
              key: 'window',
              header: 'Hours',
              render: (r) => `${r.startTime.slice(0, 5)} – ${r.endTime.slice(0, 5)}`,
            },
            {
              key: 'mult',
              header: 'Multiplier',
              render: (r) => <span className={styles.badge}>{r.priceMultiplier}x</span>,
            },
            {
              key: 'rate',
              header: 'Effective rate',
              render: (r) => `$${(r.service.price * r.priceMultiplier).toFixed(2)}`,
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (r) => (
                <div className={styles.actions}>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => handleEditClick(r)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeleteId(r.id)}>
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
          rows={rules}
          rowKey={(r) => r.id}
        />
      )}

      <Modal
        open={showModal}
        title={editingRule ? 'Edit peak price rule' : 'Add peak price rule'}
        onClose={() => setShowModal(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" form="peak-form" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingRule ? 'Update rule' : 'Save rule'}
            </button>
          </>
        }
      >
        <form id="peak-form" onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="peakServiceSelect">
              Service
            </label>
            <select
              id="peakServiceSelect"
              className="select-field"
              value={formData.serviceId}
              onChange={(e) => handleInputChange('serviceId', e.target.value)}
            >
              {services.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.name} (${svc.price})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="peakDaySelect">
              Day of week
            </label>
            <select
              id="peakDaySelect"
              className="select-field"
              value={formData.dayOfWeek}
              onChange={(e) => handleInputChange('dayOfWeek', parseInt(e.target.value))}
            >
              {DAYS_OF_WEEK.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.twoCol}>
            <div className="form-group">
              <label className="form-label" htmlFor="peakStartTime">
                Start time
              </label>
              <input
                id="peakStartTime"
                type="time"
                className="input-field"
                value={formData.startTime}
                onChange={(e) => handleInputChange('startTime', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="peakEndTime">
                End time
              </label>
              <input
                id="peakEndTime"
                type="time"
                className="input-field"
                value={formData.endTime}
                onChange={(e) => handleInputChange('endTime', e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="multiplierInput">
              Price multiplier
            </label>
            <input
              id="multiplierInput"
              type="number"
              step="0.05"
              className="input-field"
              value={formData.priceMultiplier}
              onChange={(e) => handleInputChange('priceMultiplier', e.target.value)}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteId != null}
        title="Delete pricing rule"
        message="Are you sure you want to delete this pricing rule?"
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

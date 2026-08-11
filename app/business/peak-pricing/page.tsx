'use client';

import { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
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
  startTime: string; // "HH:mm:ss"
  endTime: string;   // "HH:mm:ss"
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

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<TimeOfDayPricing | null>(null);
  const [formData, setFormData] = useState({
    serviceId: '',
    dayOfWeek: 6, // default Saturday
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

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this pricing rule?')) return;
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/business/time-pricing/${id}`, {
        method: 'DELETE',
      });
      setMessage('Peak pricing rule deleted.');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Deactivation failed.');
    }
  };

  const getDayName = (dayVal: number) => {
    return DAYS_OF_WEEK.find((d) => d.value === dayVal)?.label || 'Everyday';
  };

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className={styles.peakContainer}>
      <div className={styles.headerRow}>
        <p style={{ color: 'var(--text-secondary)' }}>
          Configure time-of-day and day-of-week demand multipliers (e.g. peak hours or weekend surcharges).
        </p>
        <button className="btn btn-primary" onClick={handleAddClick} disabled={services.length === 0}>
          <i className="fa-solid fa-plus"></i> Configure Peak Rate
        </button>
      </div>

      {message && <div className="success-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-circle-check"></i> {message}</div>}
      {error && <div className="error-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-triangle-exclamation"></i> {error}</div>}

      {services.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏷️</div>
          <h3>Services Required</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Create services first under the Services Catalog tab before defining peak rates.</p>
        </div>
      ) : rules.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚡</div>
          <h3>No Peak Pricing Configured</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Charge multiplier fees on premium slots (e.g. weekend afternoons).</p>
          <button className="btn btn-primary" onClick={handleAddClick}>Configure Peak Rate</button>
        </div>
      ) : (
        <div className="glass-card table-responsive" style={{ padding: '10px 0' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Target Day</th>
                <th>Hours Window</th>
                <th>Pricing Multiplier</th>
                <th>Effective Rate</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => {
                const basePrice = rule.service.price;
                const peakPrice = (basePrice * rule.priceMultiplier).toFixed(2);
                return (
                  <tr key={rule.id}>
                    <td style={{ fontWeight: 700, color: '#ffffff' }}>{rule.service.name}</td>
                    <td style={{ color: '#ffffff' }}>{getDayName(rule.dayOfWeek)}</td>
                    <td>{rule.startTime.slice(0, 5)} to {rule.endTime.slice(0, 5)}</td>
                    <td>
                      <span className={styles.multiplierBadge}>
                        {rule.priceMultiplier}x Surge
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                      ${peakPrice} <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 400 }}>(${basePrice} base)</span>
                    </td>
                    <td className="text-right">
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-sm" onClick={() => handleEditClick(rule)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(rule.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Dialog */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modalContent}`}>
            <div className={styles.modalHeader}>
              <h3>{editingRule ? 'Edit Peak Price Rule' : 'Add Peak Price Rule'}</h3>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="peakServiceSelect">Select Service</label>
                <select
                  id="peakServiceSelect"
                  className="input-field"
                  value={formData.serviceId}
                  onChange={(e) => handleInputChange('serviceId', e.target.value)}
                >
                  {services.map((svc) => (
                    <option key={svc.id} value={svc.id}>{svc.name} (${svc.price})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="peakDaySelect">Applicable Day of Week</label>
                <select
                  id="peakDaySelect"
                  className="input-field"
                  value={formData.dayOfWeek}
                  onChange={(e) => handleInputChange('dayOfWeek', parseInt(e.target.value))}
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="peakStartTime">Start Time</label>
                  <input
                    id="peakStartTime"
                    type="time"
                    className="input-field"
                    value={formData.startTime}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="peakEndTime">End Time</label>
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
                <label className="form-label" htmlFor="multiplierInput">Price Multiplier (e.g. 1.2 = +20%)</label>
                <input
                  id="multiplierInput"
                  type="number"
                  step="0.05"
                  className="input-field"
                  value={formData.priceMultiplier}
                  onChange={(e) => handleInputChange('priceMultiplier', e.target.value)}
                  placeholder="e.g. 1.30"
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={submitting}>
                {submitting ? 'Saving...' : editingRule ? 'Update Rule' : 'Save Pricing Rule'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

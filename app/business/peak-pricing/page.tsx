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
import CustomSelect from '@/components/CustomSelect';
import CustomTimePicker from '@/components/CustomTimePicker';
import { useOrgLocale } from '@/lib/org-locale-context';
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
  const { format } = useOrgLocale();
  const { plan, loaded: planLoaded } = useOwnerPlan();
  const canManage = planLoaded && hasFeature(plan, 'peak_pricing');
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
  const [searchQuery, setSearchQuery] = useState('');
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

  // Calculate statistics
  const totalRules = rules.length;
  const avgMultiplier =
    rules.length > 0
      ? (rules.reduce((acc, curr) => acc + curr.priceMultiplier, 0) / rules.length).toFixed(2)
      : '1.00';

  // Filter peak pricing overrides
  const filteredRules = rules.filter((r) =>
    r.service.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <PageHeader
        title="Peak pricing"
        subtitle={
          canManage
            ? 'Configure day-of-week and time-of-day demand multipliers.'
            : upgradeHint(plan, 'peak_pricing', 'peak pricing')
        }
        actions={
          canManage ? (
            <button type="button" className="btn btn-primary" onClick={handleAddClick} disabled={services.length === 0}>
              <i className="fa-solid fa-plus" /> Configure Peak Rate
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

      {rules.length > 0 && (
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fa-solid fa-bolt" />
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{totalRules}</div>
              <div className={styles.statLabel}>Demand Rules</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fa-solid fa-chart-line" />
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{avgMultiplier}x</div>
              <div className={styles.statLabel}>Average Multiplier</div>
            </div>
          </div>
        </div>
      )}

      {rules.length > 0 && (
        <div className={styles.searchBarContainer}>
          <div className={styles.searchContainer}>
            <i className={`fa-solid fa-magnifying-glass ${styles.searchIcon}`} />
            <input
              type="text"
              className={`input-field ${styles.searchInput}`}
              placeholder="Search by service name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {loading ? (
        <Skeleton variant="row" count={4} />
      ) : !canManage && rules.length === 0 ? (
        <EmptyState
          icon="fa-lock"
          title="Peak pricing is a paid feature"
          description={upgradeHint(plan, 'peak_pricing', 'peak pricing')}
        />
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
        <div className={styles.rulesGrid}>
          {filteredRules.map((r) => (
            <div key={r.id} className={styles.ruleCard}>
              <div className={styles.cardHeader}>
                <h4 className={styles.serviceName}>{r.service.name}</h4>
                <span className={styles.badgeMultiplier}>{r.priceMultiplier}x Rate</span>
              </div>

              <div className={styles.cardDetails}>
                <div className={styles.detailItem}>
                  <i className="fa-regular fa-calendar" />
                  <span>Day: {getDayName(r.dayOfWeek)}</span>
                </div>
                <div className={styles.detailItem}>
                  <i className="fa-regular fa-clock" />
                  <span>Window: {r.startTime.slice(0, 5)} – {r.endTime.slice(0, 5)}</span>
                </div>
                <div className={styles.detailItem} style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '10px', marginTop: '6px' }}>
                  <div className={styles.rateComparison}>
                    <span className={styles.originalRate}>Base: {format(r.service.price)}</span>
                    <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} />
                    <span className={styles.peakRate}>Peak: {format(r.service.price * r.priceMultiplier)}</span>
                  </div>
                </div>
              </div>

              <div className={styles.cardBottom}>
                <div className={styles.actions}>
                  {canManage && (
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => handleEditClick(r)}>
                      <i className="fa-regular fa-pen-to-square" style={{ marginRight: 4 }} /> Edit
                    </button>
                  )}
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeleteId(r.id)}>
                    <i className="fa-regular fa-trash-can" style={{ marginRight: 4 }} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredRules.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '2rem', marginBottom: 12 }} />
              <p>No peak pricing rules match your search query.</p>
            </div>
          )}
        </div>
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
              Service:
            </label>
            <CustomSelect
              id="peakServiceSelect"
              options={services.map((svc) => ({
                value: svc.id.toString(),
                label: `${svc.name} (${format(svc.price)})`,
              }))}
              value={formData.serviceId}
              onChange={(val) => handleInputChange('serviceId', val)}
              searchable={true}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="peakDaySelect">
              Day of week:
            </label>
            <CustomSelect
              id="peakDaySelect"
              options={DAYS_OF_WEEK.map((d) => ({
                value: d.value.toString(),
                label: d.label,
              }))}
              value={formData.dayOfWeek.toString()}
              onChange={(val) => handleInputChange('dayOfWeek', parseInt(val))}
              searchable={false}
            />
          </div>
          <div className={styles.twoCol}>
            <div className="form-group">
              <label className="form-label" htmlFor="peakStartTime">
              Start time:
            </label>
              <CustomTimePicker
                id="peakStartTime"
                value={formData.startTime}
                onChange={(val) => handleInputChange('startTime', val)}
                intervalMinutes={30}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="peakEndTime">
              End time:
            </label>
              <CustomTimePicker
                id="peakEndTime"
                value={formData.endTime}
                onChange={(val) => handleInputChange('endTime', val)}
                intervalMinutes={30}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="multiplierInput">
              Price multiplier:
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

'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';
import styles from './settings.module.css';

interface SystemConfig {
  defaultCommissionRate: number;
  supportedCurrencies: string;
  registrationOpen: boolean;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [defaultCommissionRate, setDefaultCommissionRate] = useState(10);
  const [supportedCurrencies, setSupportedCurrencies] = useState('USD,PKR,AED');
  const [registrationOpen, setRegistrationOpen] = useState(true);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<SystemConfig>('/api/admin/settings');
      setSettings(data);
      setDefaultCommissionRate(data.defaultCommissionRate);
      setSupportedCurrencies(data.supportedCurrencies);
      setRegistrationOpen(data.registrationOpen);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve system settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: SystemConfig = {
        defaultCommissionRate,
        supportedCurrencies,
        registrationOpen,
      };
      const updated = await apiFetch<SystemConfig>('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setSettings(updated);
      setSuccess('Global platform configuration settings saved successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to persist platform configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className={styles.settingsWrapper}>
        <Skeleton variant="title" />
        <Skeleton variant="card" height={320} />
      </div>
    );
  }

  return (
    <div className={styles.settingsWrapper}>
      <PageHeader title="Settings" subtitle="Configure default commission, currencies, and registration access." />

      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="success-alert">
          <i className="fa-solid fa-circle-check" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className={`surface ${styles.settingsCard}`}>
        <div className="form-group">
          <label className="form-label" htmlFor="commission">
            Default commission cut (%)
          </label>
          <p className={styles.hint}>Applied to new business registrations by default.</p>
          <input
            id="commission"
            type="number"
            min="0"
            max="100"
            step="0.1"
            className="input-field"
            value={defaultCommissionRate}
            onChange={(e) => setDefaultCommissionRate(parseFloat(e.target.value) || 0)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="currencies">
            Supported currencies
          </label>
          <p className={styles.hint}>Comma-separated list (e.g. USD,PKR,AED,EUR).</p>
          <input
            id="currencies"
            type="text"
            className="input-field"
            value={supportedCurrencies}
            onChange={(e) => setSupportedCurrencies(e.target.value)}
            required
          />
        </div>

        <div className={styles.toggleRow}>
          <div>
            <div className={styles.toggleTitle}>Public registrations open</div>
            <p className={styles.hint}>Allow new customers and business owners to sign up.</p>
          </div>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={registrationOpen}
              onChange={() => setRegistrationOpen(!registrationOpen)}
            />
            <span className={styles.slider} />
          </label>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save configurations'}
        </button>
      </form>
    </div>
  );
}

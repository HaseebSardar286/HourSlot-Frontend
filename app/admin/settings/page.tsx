'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
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
        registrationOpen
      };
      
      const updated = await apiFetch<SystemConfig>('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(payload)
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <div className="spinner" style={{ width: '28px', height: '28px', borderTopColor: 'var(--accent-primary)', borderWidth: '3px' }} />
      </div>
    );
  }

  return (
    <div className={styles.settingsWrapper}>
      {/* Messages */}
      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="success-alert">
          <i className="fa-solid fa-circle-check"></i>
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className={styles.settingsCard}>
        <h2 className={styles.sectionTitle}>Platform Configuration</h2>
        
        {/* Default Commission Rate */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Default Commission Cut (%)</label>
          <span className={styles.formDesc}>Platform commission fee rate applied to new business registrations by default. Can be overridden per business.</span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            className="input-field"
            style={{ width: '150px', fontWeight: 600 }}
            value={defaultCommissionRate}
            onChange={(e) => setDefaultCommissionRate(parseFloat(e.target.value) || 0)}
            required
          />
        </div>

        {/* Supported Currencies */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Supported Currencies List</label>
          <span className={styles.formDesc}>Comma-separated currencies allowed for branch pricing models (e.g. USD,PKR,AED,EUR).</span>
          <input
            type="text"
            className="input-field"
            style={{ fontWeight: 600 }}
            value={supportedCurrencies}
            onChange={(e) => setSupportedCurrencies(e.target.value)}
            required
          />
        </div>

        {/* Registration Availability Toggle */}
        <div className={styles.toggleRow}>
          <div className={styles.toggleLabel}>
            <span className={styles.toggleTitle}>Public Registrations Open</span>
            <span className={styles.toggleDesc}>Allow new customers and business owners to sign up. Toggle off to lock system onboarding.</span>
          </div>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={registrationOpen}
              onChange={() => setRegistrationOpen(!registrationOpen)}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <button type="submit" className="btn btn-primary" style={{ padding: '12px 28px', width: 'fit-content', marginTop: '10px' }} disabled={saving}>
          {saving ? (
            <>
              <span className="spinner" style={{ borderTopColor: 'var(--accent-primary)', marginRight: '6px' }}></span> Saving settings...
            </>
          ) : (
            <>
              <i className="fa-solid fa-floppy-disk"></i> Save Configurations
            </>
          )}
        </button>
      </form>
    </div>
  );
}

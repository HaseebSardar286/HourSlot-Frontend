'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { fetchCurrencies, type CurrencyView } from '@/lib/geo';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';
import CustomSelect from '@/components/CustomSelect';
import styles from './settings.module.css';

interface SystemConfig {
  defaultCommissionRate: number;
  supportedCurrencies: string;
  defaultCurrency?: string;
  registrationOpen: boolean;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [defaultCommissionRate, setDefaultCommissionRate] = useState(10);
  const [supportedList, setSupportedList] = useState<string[]>(['USD', 'PKR', 'AED', 'EUR', 'GBP']);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [catalog, setCatalog] = useState<CurrencyView[]>([]);
  const [addCode, setAddCode] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, currencies] = await Promise.all([
        apiFetch<SystemConfig>('/api/admin/settings'),
        fetchCurrencies(false),
      ]);
      setSettings(data);
      setDefaultCommissionRate(data.defaultCommissionRate);
      const parsed = (data.supportedCurrencies || 'USD,PKR,AED,EUR,GBP')
        .split(',')
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean);
      setSupportedList(parsed.length ? parsed : ['USD']);
      setDefaultCurrency(data.defaultCurrency || parsed[0] || 'USD');
      setRegistrationOpen(data.registrationOpen);
      setCatalog(currencies);
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
        supportedCurrencies: supportedList.join(','),
        defaultCurrency,
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

  const addCurrency = (code: string) => {
    const next = code.trim().toUpperCase();
    if (!next || supportedList.includes(next)) return;
    setSupportedList((prev) => [...prev, next]);
    setAddCode('');
  };

  if (loading && !settings) {
    return (
      <div className={styles.settingsWrapper}>
        <Skeleton variant="title" />
        <Skeleton variant="card" height={320} />
      </div>
    );
  }

  const catalogOptions = catalog
    .filter((c) => !supportedList.includes(c.code))
    .map((c) => ({
      value: c.code,
      label: `${c.code}${c.symbol ? ` (${c.symbol})` : ''} — ${c.name}`,
    }));

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
          <label className="form-label">
              Supported currencies
            </label>
          <p className={styles.hint}>
            Businesses pick their operating currency from this list (sourced from REST Countries).
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {supportedList.map((code) => (
              <button
                key={code}
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => {
                  const next = supportedList.filter((c) => c !== code);
                  setSupportedList(next.length ? next : supportedList);
                  if (defaultCurrency === code && next[0]) setDefaultCurrency(next[0]);
                }}
              >
                {code} <i className="fa-solid fa-xmark" style={{ marginLeft: 6 }} />
              </button>
            ))}
          </div>
          <CustomSelect
            options={catalogOptions}
            value={addCode}
            onChange={(val) => {
              setAddCode(val);
              addCurrency(val);
            }}
            placeholder="Add a currency from the world catalog"
          />
        </div>

        <div className="form-group">
          <label className="form-label">
              Default currency for new organizations
            </label>
          <CustomSelect
            options={supportedList.map((code) => ({ value: code, label: code }))}
            value={defaultCurrency}
            onChange={setDefaultCurrency}
            placeholder="Select default"
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

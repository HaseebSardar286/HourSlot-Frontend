'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useOrgLocale } from '@/lib/org-locale-context';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';

type Service = {
  id: number;
  name: string;
  description?: string;
  price?: number;
  basePrice?: number;
  currency?: string;
  durationMinutes: number;
  active?: boolean;
  pricingType?: string;
  serviceMode?: string;
};

export default function SoloServicesPage() {
  const { format } = useOrgLocale();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    durationMinutes: '60',
    pricingType: 'FIXED',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Service[]>('/api/provider/services');
      setServices(data);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Failed to load services.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/provider/services', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: Number(form.price || 0),
          durationMinutes: Number(form.durationMinutes || 60),
          pricingType: form.pricingType,
          requiresQuote: form.pricingType === 'QUOTE',
          allowsHomeService: true,
        }),
      });
      setForm({ name: '', description: '', price: '', durationMinutes: '60', pricingType: 'FIXED' });
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not save service.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this service?')) return;
    await apiFetch(`/api/provider/services/${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 40 }}>
      <PageHeader
        title="Services"
        subtitle="What you offer as an individual professional — no staff rates or packages."
      />
      {error && <div className="error-alert" style={{ marginBottom: 14 }}>{error}</div>}

      <form onSubmit={onSubmit} className="card" style={{ padding: 18, marginBottom: 18, display: 'grid', gap: 12 }}>
        <strong>Add a service</strong>
        <input
          required
          placeholder="Service name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="form-input"
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="form-input"
          rows={3}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <input
            type="number"
            min={0}
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            className="form-input"
            disabled={form.pricingType === 'QUOTE'}
          />
          <input
            type="number"
            min={15}
            placeholder="Duration (min)"
            value={form.durationMinutes}
            onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
            className="form-input"
          />
          <select
            value={form.pricingType}
            onChange={(e) => setForm((f) => ({ ...f, pricingType: e.target.value }))}
            className="form-input"
          >
            <option value="FIXED">Fixed price</option>
            <option value="QUOTE">Quote only</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Add service'}
        </button>
      </form>

      {loading ? (
        <Skeleton variant="card" height={160} />
      ) : services.length === 0 ? (
        <EmptyState icon="fa-tags" title="No services yet" description="Add the work you offer so customers can book or request quotes." />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {services.map((s) => (
            <article key={s.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <strong>{s.name}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                  {s.pricingType === 'QUOTE' ? 'Quote' : format(s.price ?? s.basePrice ?? 0)} · {s.durationMinutes} min
                </div>
                {s.description && <p style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>{s.description}</p>}
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => void remove(s.id)}>
                Delete
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

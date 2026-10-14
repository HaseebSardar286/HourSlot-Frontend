'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';

type DocType = { code: string; label?: string; name?: string };
type Doc = { id: number; documentType: string; status: string; fileUrl?: string };
type Payload = {
  documents?: Doc[];
  requiredTypes?: DocType[];
  tier1Types?: DocType[];
  readiness?: Record<string, unknown>;
};

export default function SoloVerificationPage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Payload>('/api/provider/verification-documents');
      setPayload(data);
      const first = data.tier1Types?.[0]?.code || data.requiredTypes?.[0]?.code || '';
      setDocType(first);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Failed to load verification.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async () => {
    if (!file || !docType) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const body = new FormData();
      body.append('documentType', docType);
      body.append('file', file);
      await apiFetch('/api/provider/verification-documents', { method: 'POST', body });
      setMessage('Document uploaded for review.');
      setFile(null);
      await load();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Skeleton variant="card" height={240} />;

  const types = payload?.tier1Types?.length ? payload.tier1Types : payload?.requiredTypes || [];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 40 }}>
      <PageHeader
        title="Verification"
        subtitle="Upload identity / professional documents for your solo listing."
      />
      {message && <div className="success-alert" style={{ marginBottom: 14 }}>{message}</div>}
      {error && <div className="error-alert" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="card" style={{ padding: 16, marginBottom: 16, display: 'grid', gap: 10 }}>
        <strong>Upload document</strong>
        <select className="form-input" value={docType} onChange={(e) => setDocType(e.target.value)}>
          {types.map((t) => (
            <option key={t.code} value={t.code}>
              {t.label || t.name || t.code}
            </option>
          ))}
        </select>
        <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button type="button" className="btn btn-primary" disabled={busy || !file} onClick={() => void upload()}>
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {(payload?.documents || []).map((d) => (
          <article key={d.id} className="card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{d.documentType}</strong>
              {d.fileUrl && (
                <div>
                  <a href={d.fileUrl} target="_blank" rel="noreferrer">
                    View file
                  </a>
                </div>
              )}
            </div>
            <StatusBadge status={d.status} />
          </article>
        ))}
        {(payload?.documents || []).length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>No documents uploaded yet.</p>
        )}
      </div>
    </div>
  );
}

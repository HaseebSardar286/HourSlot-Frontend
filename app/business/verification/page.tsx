'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import styles from './verification.module.css';

type DocType = { code: string; label: string };
type Doc = {
  id: number;
  documentType: string;
  label: string;
  status: string;
  originalFilename?: string;
  url?: string;
  reviewNotes?: string;
};

type Payload = {
  documents: Doc[];
  readiness: {
    readyForVerifiedBadge: boolean;
    approvedCount: number;
    requiredCount: number;
    submittedCount: number;
  };
  requiredTypes: DocType[];
};

export default function VerificationPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState('TRADE_LICENSE');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiFetch<Payload>('/api/business/verification-documents');
      setData(payload);
      if (payload.requiredTypes?.length && !payload.requiredTypes.find((t) => t.code === documentType)) {
        setDocumentType(payload.requiredTypes[0].code);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Could not load verification documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Choose a file to upload.');
      return;
    }
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const body = new FormData();
      body.append('documentType', documentType);
      body.append('file', file);
      const token = (() => {
        try {
          const raw = localStorage.getItem('hourslot_user_session');
          return raw ? (JSON.parse(raw).token as string) : null;
        } catch {
          return null;
        }
      })();
      const res = await fetch('/api/business/verification-documents', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || 'Upload failed.');
      }
      setMessage(json.message || 'Document uploaded.');
      setFile(null);
      await load();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className={styles.page}>
        <Skeleton variant="title" />
        <Skeleton variant="card" count={2} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Verification documents"
        subtitle="Submit trade license, bank statement, and owner government ID. Super Admin reviews each file before granting a verified badge."
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

      <div className={`surface ${styles.readiness}`}>
        <div>
          <strong>
            {data?.readiness?.approvedCount ?? 0}/{data?.readiness?.requiredCount ?? 3} documents approved
          </strong>
          <p>
            {data?.readiness?.readyForVerifiedBadge
              ? 'Ready for verified badge. Waiting for Super Admin to grant it.'
              : 'Upload all three required document types, then wait for Super Admin review.'}
          </p>
        </div>
        <StatusBadge status={data?.readiness?.readyForVerifiedBadge ? 'APPROVED' : 'PENDING'} />
      </div>

      <div className={styles.grid}>
        <form className={`surface ${styles.uploadCard}`} onSubmit={handleUpload}>
          <h3>Upload a document</h3>
          <div className="form-group">
            <label className="form-label" htmlFor="docType">
              Document type
            </label>
            <select
              id="docType"
              className="select-field"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
            >
              {(data?.requiredTypes || []).map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="docFile">
              File (PDF, Word, or image, max 15MB)
            </label>
            <input
              id="docFile"
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Submit for review'}
          </button>
        </form>

        <div className={`surface ${styles.listCard}`}>
          <h3>Submitted files</h3>
          {(data?.documents || []).length === 0 ? (
            <p className={styles.empty}>No documents uploaded yet.</p>
          ) : (
            <ul className={styles.docList}>
              {data?.documents.map((doc) => (
                <li key={doc.id}>
                  <div>
                    <strong>{doc.label}</strong>
                    <div className={styles.meta}>{doc.originalFilename || 'Document'}</div>
                    {doc.reviewNotes && <div className={styles.notes}>{doc.reviewNotes}</div>}
                  </div>
                  <div className={styles.docActions}>
                    <StatusBadge status={doc.status} />
                    {doc.url && (
                      <a href={doc.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline">
                        View
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

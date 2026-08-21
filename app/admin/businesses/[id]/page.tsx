'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import styles from './business-detail.module.css';

interface Owner {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

interface Branch {
  id: number;
  name: string;
  address: string;
  phoneNumber?: string;
}

interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
}

interface Staff {
  id: number;
  name: string;
  designation?: string;
  rating: number;
}

interface Business {
  id: number;
  name: string;
  description?: string;
  category?: string;
  status: string;
  verified: boolean;
  commissionRate: number;
  rating: number;
  logoUrl?: string;
  rejectionReason?: string;
  createdAt: string;
  owner: Owner;
}

interface BusinessDetailResponse {
  business: Business;
  branches: Branch[];
  services: Service[];
  staff: Staff[];
  verificationDocuments?: {
    id: number;
    documentType: string;
    label: string;
    status: string;
    originalFilename?: string;
    url?: string;
    reviewNotes?: string;
  }[];
  verificationReadiness?: {
    readyForVerifiedBadge: boolean;
    approvedCount: number;
    requiredCount: number;
  };
}

export default function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: businessId } = use(params);

  const [detail, setDetail] = useState<BusinessDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [commissionRateInput, setCommissionRateInput] = useState('10');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);

  const loadDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<BusinessDetailResponse>(`/api/admin/businesses/${businessId}`);
      setDetail(data);
      setCommissionRateInput(data.business.commissionRate.toString());
    } catch (err: any) {
      setError(err.message || 'Could not load business details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [businessId]);

  const handleApproveListing = async () => {
    if (!detail) return;
    setError(null);
    setMessage(null);
    setActionLoading(true);
    try {
      await apiFetch(`/api/admin/businesses/${businessId}/approve`, { method: 'PUT' });
      setMessage('Listing approved. Customers can book once setup is complete.');
      await loadDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to approve listing.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!detail) return;
    setError(null);
    setMessage(null);
    setActionLoading(true);
    try {
      await apiFetch(`/api/admin/businesses/${businessId}/verify`, { method: 'PUT' });
      setMessage('Verified badge granted.');
      await loadDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to grant verified badge. Approve all three documents first.');
    } finally {
      setActionLoading(false);
    }
  };

  const reviewDocument = async (documentId: number, approve: boolean) => {
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/businesses/${businessId}/verification-documents/${documentId}/review`, {
        method: 'PUT',
        body: JSON.stringify({ approve, notes: approve ? 'Looks valid' : 'Please re-upload a clearer document' }),
      });
      setMessage(approve ? 'Document approved.' : 'Document rejected.');
      await loadDetails();
    } catch (err: any) {
      setError(err.message || 'Document review failed.');
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setError('Please specify a rejection reason.');
      return;
    }
    setError(null);
    setMessage(null);
    setActionLoading(true);
    setShowRejectModal(false);
    try {
      await apiFetch(`/api/admin/businesses/${businessId}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ reason: rejectionReason }),
      });
      setMessage('Business application rejected and reason logged.');
      setRejectionReason('');
      await loadDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to reject business.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    setError(null);
    setMessage(null);
    setActionLoading(true);
    try {
      await apiFetch(`/api/admin/businesses/${businessId}/suspend`, { method: 'PUT' });
      setMessage('Business has been suspended.');
      setShowSuspendConfirm(false);
      await loadDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to suspend business.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(commissionRateInput);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setError('Please enter a valid commission rate percentage (0 - 100).');
      return;
    }
    setError(null);
    setMessage(null);
    setCommissionLoading(true);
    try {
      await apiFetch(`/api/admin/businesses/${businessId}/commission?rate=${rate}`, { method: 'PUT' });
      setMessage(`Commission rate successfully updated to ${rate}%.`);
      if (detail) {
        setDetail({
          ...detail,
          business: { ...detail.business, commissionRate: rate },
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update commission rate.');
    } finally {
      setCommissionLoading(false);
    }
  };

  if (loading && !detail) {
    return (
      <div className={styles.detailWrapper}>
        <Skeleton variant="title" />
        <Skeleton variant="card" height={160} />
        <Skeleton variant="card" count={2} />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className={styles.detailWrapper}>
        <Link href="/admin/businesses" className={styles.backLink}>
          <i className="fa-solid fa-arrow-left" /> Back to businesses
        </Link>
        <div className="error-alert">Business registration details not found.</div>
      </div>
    );
  }

  const { business, branches, services, staff: staffList } = detail;
  const nameInitials = business.name.charAt(0);
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={styles.detailWrapper}>
      <PageHeader
        title={business.name}
        subtitle={`${business.category || 'Service industry'} · Registered ${formatDate(business.createdAt)}`}
        actions={
          <Link href="/admin/businesses" className="btn btn-outline btn-sm">
            <i className="fa-solid fa-arrow-left" /> Back
          </Link>
        }
      />

      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="success-alert">
          <i className="fa-solid fa-circle-check" />
          <span>{message}</span>
        </div>
      )}

      <div className={`surface ${styles.bizHeaderCard}`}>
        <div className={styles.bizHeaderLeft}>
          {business.logoUrl ? (
            <img src={business.logoUrl} alt={business.name} className={styles.largeLogo} />
          ) : (
            <div className={styles.largeInitials}>{nameInitials}</div>
          )}
          <div>
            <h2 className={styles.headerTitle}>{business.name}</h2>
            <div className={styles.headerCategory}>{business.category || 'Service industry'}</div>
          </div>
        </div>
        <StatusBadge status={business.status} />
      </div>

      <div className={styles.detailGrid}>
        <div className={styles.column}>
          <div className="surface">
            <h3 className={styles.sectionTitle}>Application profile</h3>
            <div className={styles.infoGroup}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Registration date</span>
                <span className={styles.infoValue}>{formatDate(business.createdAt)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Category</span>
                <span className={styles.infoValue}>{business.category || '—'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Rating</span>
                <span className={styles.infoValue}>
                  {business.rating > 0 ? business.rating.toFixed(1) : 'New (0.0)'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Commission</span>
                <span className={styles.infoValue}>{business.commissionRate}%</span>
              </div>
            </div>
            <p className={styles.description}>{business.description || 'No description entered.'}</p>
            {business.rejectionReason && (
              <div className={styles.rejectBox}>
                <strong>Prior rejection reason</strong>
                <p>{business.rejectionReason}</p>
              </div>
            )}
          </div>

          <div className="surface">
            <h3 className={styles.sectionTitle}>Owner details</h3>
            <div className={styles.infoGroup}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Name</span>
                <span className={styles.infoValue}>
                  {business.owner?.firstName} {business.owner?.lastName}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>{business.owner?.email}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Phone</span>
                <span className={styles.infoValue}>{business.owner?.phoneNumber || '—'}</span>
              </div>
            </div>
          </div>

          <div className="surface">
            <h3 className={styles.sectionTitle}>Verification documents</h3>
            <p className={styles.description}>
              Ready for verified badge:{' '}
              {detail.verificationReadiness?.readyForVerifiedBadge
                ? 'Yes'
                : `No (${detail.verificationReadiness?.approvedCount ?? 0}/${detail.verificationReadiness?.requiredCount ?? 3} approved)`}
            </p>
            {(detail.verificationDocuments || []).length === 0 ? (
              <p className={styles.description}>No documents uploaded yet.</p>
            ) : (
              <div className={styles.infoGroup}>
                {detail.verificationDocuments!.map((doc) => (
                  <div key={doc.id} className={styles.infoRow} style={{ alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <span className={styles.infoLabel}>{doc.label}</span>
                    <StatusBadge status={doc.status} />
                    {doc.url && (
                      <a href={doc.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline">
                        View
                      </a>
                    )}
                    {doc.status === 'SUBMITTED' && (
                      <>
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => reviewDocument(doc.id, true)}>
                          Approve doc
                        </button>
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => reviewDocument(doc.id, false)}>
                          Reject doc
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="surface">
            <h3 className={styles.sectionTitle}>Listing & verified badge</h3>
            <div className={styles.actionBtns}>
              {business.status === 'PENDING' && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleApproveListing}
                    disabled={actionLoading}
                  >
                    Approve listing
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleApprove}
                    disabled={actionLoading || !detail.verificationReadiness?.readyForVerifiedBadge}
                    title="Requires all three documents approved"
                  >
                    Grant verified badge
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading}
                  >
                    Reject
                  </button>
                </>
              )}
              {business.status === 'APPROVED' && (
                <>
                  {!business.verified && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleApprove}
                      disabled={actionLoading || !detail.verificationReadiness?.readyForVerifiedBadge}
                    >
                      Grant verified badge
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => setShowSuspendConfirm(true)}
                    disabled={actionLoading}
                  >
                    Suspend
                  </button>
                </>
              )}
              {(business.status === 'REJECTED' || business.status === 'SUSPENDED') && (
                <button type="button" className="btn btn-primary" onClick={handleApproveListing} disabled={actionLoading}>
                  Restore listing
                </button>
              )}
            </div>

            <form onSubmit={handleUpdateCommission} className={styles.commissionForm}>
              <label className="form-label" htmlFor="commissionRate">
                Commission percentage
              </label>
              <div className={styles.commissionRow}>
                <input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  className="input-field"
                  value={commissionRateInput}
                  onChange={(e) => setCommissionRateInput(e.target.value)}
                />
                <button type="submit" className="btn btn-outline btn-sm" disabled={commissionLoading}>
                  {commissionLoading ? 'Updating...' : 'Set rate'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className={styles.column}>
          <div className="surface">
            <h3 className={styles.sectionTitle}>Branches ({branches.length})</h3>
            {branches.length === 0 ? (
              <p className={styles.emptyNote}>No branches configured yet.</p>
            ) : (
              <div className={styles.itemList}>
                {branches.map((br) => (
                  <div key={br.id} className={styles.itemRow}>
                    <div className={styles.itemName}>{br.name}</div>
                    <div className={styles.itemSub}>{br.address}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="surface">
            <h3 className={styles.sectionTitle}>Services ({services.length})</h3>
            {services.length === 0 ? (
              <p className={styles.emptyNote}>No services configured yet.</p>
            ) : (
              <div className={styles.itemList}>
                {services.map((sv) => (
                  <div key={sv.id} className={styles.itemRowBetween}>
                    <div>
                      <div className={styles.itemName}>{sv.name}</div>
                      <div className={styles.itemSub}>{sv.durationMinutes} mins</div>
                    </div>
                    <strong>${sv.price.toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="surface">
            <h3 className={styles.sectionTitle}>Staff ({staffList.length})</h3>
            {staffList.length === 0 ? (
              <p className={styles.emptyNote}>No staff members configured.</p>
            ) : (
              <div className={styles.itemList}>
                {staffList.map((st) => (
                  <div key={st.id} className={styles.itemRowBetween}>
                    <div>
                      <div className={styles.itemName}>{st.name}</div>
                      <div className={styles.itemSub}>{st.designation || 'Staff'}</div>
                    </div>
                    {st.rating > 0 && <span className={styles.rating}>{st.rating.toFixed(1)}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={showRejectModal}
        title="Reject business application"
        onClose={() => {
          setShowRejectModal(false);
          setRejectionReason('');
        }}
        footer={
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setShowRejectModal(false);
                setRejectionReason('');
              }}
            >
              Cancel
            </button>
            <button type="submit" form="reject-form" className="btn btn-danger">
              Confirm rejection
            </button>
          </>
        }
      >
        <form id="reject-form" onSubmit={handleRejectSubmit}>
          <p className={styles.modalHint}>
            Enter a brief explanation. This reason is logged and visible to the business owner.
          </p>
          <div className="form-group">
            <label className="form-label" htmlFor="rejectReason">
              Rejection reason
            </label>
            <textarea
              id="rejectReason"
              className={`input-field ${styles.textarea}`}
              placeholder="e.g. Invalid registration documents..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              required
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={showSuspendConfirm}
        title="Suspend business"
        message={`Suspend "${business.name}"? This stops all service bookings.`}
        confirmLabel="Suspend"
        danger
        loading={actionLoading}
        onConfirm={handleSuspend}
        onCancel={() => setShowSuspendConfirm(false)}
      />
    </div>
  );
}

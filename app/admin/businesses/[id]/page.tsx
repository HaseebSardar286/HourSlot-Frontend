'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
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
}

export default function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: businessId } = use(params);
  const router = useRouter();

  const [detail, setDetail] = useState<BusinessDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Form states
  const [commissionRateInput, setCommissionRateInput] = useState('10');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleApprove = async () => {
    if (!detail) return;
    setError(null);
    setMessage(null);
    setActionLoading(true);
    try {
      await apiFetch(`/api/admin/businesses/${businessId}/verify`, { method: 'PUT' });
      setMessage('Business application verified and approved successfully.');
      // Refresh
      await loadDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to approve business.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      alert('Please specify a rejection reason.');
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
      // Refresh
      await loadDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to reject business.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!detail || !window.confirm(`Are you sure you want to suspend "${detail.business.name}"? This stops all service bookings.`)) {
      return;
    }
    setError(null);
    setMessage(null);
    setActionLoading(true);
    try {
      await apiFetch(`/api/admin/businesses/${businessId}/suspend`, { method: 'PUT' });
      setMessage('Business has been suspended.');
      // Refresh
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
      alert('Please enter a valid commission rate percentage (0 - 100).');
      return;
    }
    setError(null);
    setMessage(null);
    setCommissionLoading(true);
    try {
      await apiFetch(`/api/admin/businesses/${businessId}/commission?rate=${rate}`, { method: 'PUT' });
      setMessage(`Commission rate successfully updated to ${rate}%.`);
      // Update local state
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

  const [commissionLoading, setCommissionLoading] = useState(false);

  if (loading && !detail) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <div className="spinner" style={{ width: '32px', height: '32px', borderTopColor: 'var(--accent-primary)', borderWidth: '3.5px' }} />
      </div>
    );
  }

  if (!detail) {
    return (
      <div>
        <Link href="/admin/businesses" className={styles.backLink}>
          <i className="fa-solid fa-arrow-left"></i> Back to Businesses
        </Link>
        <div className="error-alert" style={{ marginTop: '20px' }}>Business registration details not found.</div>
      </div>
    );
  }

  const { business, branches, services, staff: staffList } = detail;
  const nameInitials = business.name.charAt(0);
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="badge badge-success" style={{ fontSize: '0.85rem' }}><i className="fa-solid fa-circle-check"></i> Approved</span>;
      case 'PENDING':
        return <span className="badge badge-warning" style={{ fontSize: '0.85rem' }}><i className="fa-solid fa-spinner animate-spin"></i> Pending Review</span>;
      case 'REJECTED':
        return <span className="badge badge-danger" style={{ fontSize: '0.85rem' }}><i className="fa-solid fa-circle-xmark"></i> Rejected</span>;
      case 'SUSPENDED':
        return <span className="badge badge-outline" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', borderColor: '#cbd5e1' }}><i className="fa-solid fa-ban"></i> Suspended</span>;
      default:
        return <span className="badge badge-outline" style={{ fontSize: '0.85rem' }}>{status}</span>;
    }
  };

  return (
    <div className={styles.detailWrapper}>
      {/* Breadcrumb back */}
      <Link href="/admin/businesses" className={styles.backLink}>
        <i className="fa-solid fa-arrow-left"></i> Back to Business List
      </Link>

      {/* Message banners */}
      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="success-alert">
          <i className="fa-solid fa-circle-check"></i>
          <span>{message}</span>
        </div>
      )}

      {/* Big Business Header Card */}
      <div className={styles.bizHeaderCard}>
        <div className={styles.bizHeaderLeft}>
          {business.logoUrl ? (
            <img src={business.logoUrl} alt={business.name} className={styles.largeLogo} />
          ) : (
            <div className={styles.largeInitials}>{nameInitials}</div>
          )}
          <div>
            <h2 className={styles.headerTitle}>{business.name}</h2>
            <div className={styles.headerCategory}>{business.category || 'Service Industry'}</div>
          </div>
        </div>
        <div>
          {getStatusBadge(business.status)}
        </div>
      </div>

      {/* Main Details Grid */}
      <div className={styles.detailGrid}>
        
        {/* Left Column: Profile Info & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className={styles.infoCard}>
            <h3 className={styles.sectionTitle}>Application Profile</h3>
            
            <div className={styles.infoGroup}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Registration Date</span>
                <span className={styles.infoValue}>{formatDate(business.createdAt)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Category Group</span>
                <span className={styles.infoValue}>{business.category || '—'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Business Rating</span>
                <span className={styles.infoValue} style={{ color: 'var(--accent-yellow)' }}>
                  <i className="fa-solid fa-star"></i> {business.rating > 0 ? business.rating.toFixed(1) : 'New (0.0)'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Current Commission Cut</span>
                <span className={styles.infoValue}>{business.commissionRate}%</span>
              </div>
            </div>

            <div style={{ marginTop: '10px' }}>
              <span className={styles.infoLabel} style={{ display: 'block', marginBottom: '8px' }}>Business Description</span>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {business.description || 'No description entered.'}
              </p>
            </div>

            {business.rejectionReason && (
              <div style={{ marginTop: '10px', padding: '14px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 'var(--radius-sm)' }}>
                <span className={styles.infoLabel} style={{ display: 'block', color: 'var(--accent-red)', marginBottom: '4px' }}>Prior Rejection Reason</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--accent-red)' }}>{business.rejectionReason}</p>
              </div>
            )}
          </div>

          {/* Owner Profile Card */}
          <div className={styles.infoCard}>
            <h3 className={styles.sectionTitle}>Business Owner Details</h3>
            <div className={styles.infoGroup}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Full Name</span>
                <span className={styles.infoValue}>{business.owner?.firstName} {business.owner?.lastName}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Primary Email</span>
                <span className={styles.infoValue}>{business.owner?.email}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Phone Contact</span>
                <span className={styles.infoValue}>{business.owner?.phoneNumber || '—'}</span>
              </div>
            </div>
          </div>

          {/* Verification & Commission Configuration Actions */}
          <div className={styles.infoCard}>
            <h3 className={styles.sectionTitle}>Verification & Rates Panel</h3>
            
            <div className={styles.actionPanel}>
              <span className={styles.infoLabel}>Verification Actions</span>
              <div className={styles.actionBtns}>
                {business.status === 'PENDING' && (
                  <>
                    <button className="btn btn-primary" onClick={handleApprove} disabled={actionLoading} style={{ flex: 1 }}>
                      <i className="fa-solid fa-circle-check"></i> Approve Application
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowRejectModal(true)} disabled={actionLoading} style={{ flex: 1 }}>
                      <i className="fa-solid fa-circle-xmark"></i> Reject Application
                    </button>
                  </>
                )}

                {business.status === 'APPROVED' && (
                  <button className="btn btn-secondary" onClick={handleSuspend} disabled={actionLoading} style={{ flex: 1 }}>
                    <i className="fa-solid fa-ban"></i> Suspend Business Profile
                  </button>
                )}

                {(business.status === 'REJECTED' || business.status === 'SUSPENDED') && (
                  <button className="btn btn-primary" onClick={handleApprove} disabled={actionLoading} style={{ flex: 1 }}>
                    <i className="fa-solid fa-rotate-left"></i> Restore & Approve Profile
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleUpdateCommission} className={styles.actionPanel} style={{ marginTop: '16px' }}>
              <span className={styles.infoLabel}>Adjust Commission Percentage</span>
              <div className={styles.commissionForm}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  className={styles.commissionInput}
                  value={commissionRateInput}
                  onChange={(e) => setCommissionRateInput(e.target.value)}
                />
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>% cut</span>
                
                <button type="submit" className="btn btn-outline" style={{ marginLeft: 'auto', padding: '10px 18px' }} disabled={commissionLoading}>
                  {commissionLoading ? 'Updating...' : 'Set Rate'}
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Right Column: Branches, Staff, and Services previews */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Associated Branches */}
          <div className={styles.infoCard}>
            <h3 className={styles.sectionTitle}>Registered Branches ({branches.length})</h3>
            <div className={styles.itemList}>
              {branches.length === 0 ? (
                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                  No branches configured yet.
                </div>
              ) : (
                branches.map((br) => (
                  <div key={br.id} className={styles.itemRow}>
                    <div className={styles.itemName}><i className="fa-solid fa-location-dot" style={{ color: 'var(--accent-primary)', marginRight: '6.5px' }}></i> {br.name}</div>
                    <div className={styles.itemSub}>{br.address}</div>
                    {br.phoneNumber && (
                      <div className={styles.itemSub} style={{ fontSize: '0.75rem', marginTop: '2px' }}><i className="fa-solid fa-phone"></i> {br.phoneNumber}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Service Offerings */}
          <div className={styles.infoCard}>
            <h3 className={styles.sectionTitle}>Services Offered ({services.length})</h3>
            <div className={styles.itemList}>
              {services.length === 0 ? (
                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                  No services configured yet.
                </div>
              ) : (
                services.map((sv) => (
                  <div key={sv.id} className={styles.itemRow} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className={styles.itemName}>{sv.name}</div>
                      <div className={styles.itemSub}><i className="fa-regular fa-clock"></i> {sv.durationMinutes} mins</div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '1rem' }}>
                      ${sv.price.toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Staff Members */}
          <div className={styles.infoCard}>
            <h3 className={styles.sectionTitle}>Staff Members ({staffList.length})</h3>
            <div className={styles.itemList}>
              {staffList.length === 0 ? (
                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                  No staff members configured.
                </div>
              ) : (
                staffList.map((st) => (
                  <div key={st.id} className={styles.itemRow} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className={styles.itemName}>{st.name}</div>
                      <div className={styles.itemSub}>{st.designation || 'Staff Service Professional'}</div>
                    </div>
                    {st.rating > 0 && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--accent-yellow)', fontWeight: 700 }}>
                        <i className="fa-solid fa-star"></i> {st.rating.toFixed(1)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Rejection Reason modal overlay */}
      {showRejectModal && (
        <div className={styles.modalOverlay}>
          <form onSubmit={handleRejectSubmit} className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Reject Business Application</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Please enter a brief explanation detailing why this business profile application is rejected. This reason will be logged and visible to the business owner onboarding wizard.
            </p>
            <textarea
              className={styles.modalTextarea}
              placeholder="e.g. Invalid business registration documents, name mismatch..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              required
            />
            <div className={styles.modalBtns}>
              <button type="button" className="btn btn-outline" style={{ padding: '8px 16px' }} onClick={() => { setShowRejectModal(false); setRejectionReason(''); }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-secondary" style={{ padding: '8px 16px', background: 'var(--accent-red)', color: '#fff', borderColor: 'var(--accent-red)' }}>
                Confirm Rejection
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import styles from './businesses.module.css';

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
  owner: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [statusFilter, setStatusFilter] = useState(''); // Empty string = ALL
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadBusinesses = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/admin/businesses?status=${encodeURIComponent(statusFilter)}&search=${encodeURIComponent(searchQuery)}`;
      const data = await apiFetch<Business[]>(url);
      setBusinesses(data);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve business listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadBusinesses();
  };

  const handleQuickVerify = async (e: React.MouseEvent, bizId: number, bizName: string) => {
    e.preventDefault(); // Prevents clicking the card Link
    if (!window.confirm(`Are you sure you want to verify and approve the business application for "${bizName}"?`)) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/businesses/${bizId}/verify`, { method: 'PUT' });
      setMessage(`Business "${bizName}" verified and approved successfully.`);
      
      // Update locally or filter out if we are on PENDING tab
      if (statusFilter === 'PENDING') {
        setBusinesses(prev => prev.filter(b => b.id !== bizId));
      } else {
        setBusinesses(prev => prev.map(b => b.id === bizId ? { ...b, verified: true, status: 'APPROVED' } : b));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify business.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="badge badge-success"><i className="fa-solid fa-circle-check"></i> Approved</span>;
      case 'PENDING':
        return <span className="badge badge-warning"><i className="fa-solid fa-spinner animate-spin"></i> Pending Review</span>;
      case 'REJECTED':
        return <span className="badge badge-danger"><i className="fa-solid fa-circle-xmark"></i> Rejected</span>;
      case 'SUSPENDED':
        return <span className="badge badge-outline" style={{ color: 'var(--text-muted)', borderColor: '#cbd5e1' }}><i className="fa-solid fa-ban"></i> Suspended</span>;
      default:
        return <span className="badge badge-outline">{status}</span>;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={styles.businessesWrapper}>
      {/* Messages */}
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

      {/* Tabs & Search Filter Header */}
      <div className={styles.filterBar}>
        <div className={styles.tabGroup}>
          <button className={`${styles.tabBtn} ${statusFilter === '' ? styles.tabActive : ''}`} onClick={() => setStatusFilter('')}>
            All
          </button>
          <button className={`${styles.tabBtn} ${statusFilter === 'PENDING' ? styles.tabActive : ''}`} onClick={() => setStatusFilter('PENDING')}>
            Pending Review
          </button>
          <button className={`${styles.tabBtn} ${statusFilter === 'APPROVED' ? styles.tabActive : ''}`} onClick={() => setStatusFilter('APPROVED')}>
            Approved
          </button>
          <button className={`${styles.tabBtn} ${statusFilter === 'REJECTED' ? styles.tabActive : ''}`} onClick={() => setStatusFilter('REJECTED')}>
            Rejected
          </button>
          <button className={`${styles.tabBtn} ${statusFilter === 'SUSPENDED' ? styles.tabActive : ''}`} onClick={() => setStatusFilter('SUSPENDED')}>
            Suspended
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className={styles.searchGroup}>
          <span className={styles.searchIcon}><i className="fa-solid fa-magnifying-glass"></i></span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search business, category, owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" style={{ display: 'none' }}></button>
        </form>
      </div>

      {/* Business Applications Cards Grid */}
      {loading && businesses.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <div className="spinner" style={{ width: '28px', height: '28px', borderTopColor: 'var(--accent-primary)', borderWidth: '3px' }} />
        </div>
      ) : (
        <div className={styles.businessGrid}>
          {businesses.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
              <span style={{ display: 'block', fontSize: '2rem', color: 'var(--text-muted)', marginBottom: '10px' }}><i className="fa-solid fa-folder-open"></i></span>
              <span style={{ color: 'var(--text-muted)' }}>No business applications found.</span>
            </div>
          ) : (
            businesses.map((b) => {
              const nameInitials = b.name.charAt(0);
              
              return (
                <div key={b.id} className={styles.businessCard}>
                  <div>
                    <div className={styles.cardTop}>
                      {b.logoUrl ? (
                        <img src={b.logoUrl} alt={b.name} className={styles.bizLogo} />
                      ) : (
                        <div className={styles.bizInitials}>{nameInitials}</div>
                      )}
                      
                      <div className={styles.bizMeta}>
                        <h3 className={styles.bizName}>{b.name}</h3>
                        <span className={styles.bizCategory}>{b.category || 'Service Provider'}</span>
                      </div>
                    </div>

                    <div className={styles.cardBody}>
                      <p className={styles.bizDesc}>{b.description || 'No description provided.'}</p>
                      <div className={styles.detailRow}>
                        <div className={styles.detailItem}>
                          <i className="fa-solid fa-user-tie"></i>
                          <span>Owner: {b.owner?.firstName} {b.owner?.lastName}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <i className="fa-solid fa-envelope"></i>
                          <span style={{ fontSize: '0.78rem' }}>{b.owner?.email}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <i className="fa-solid fa-calendar-day"></i>
                          <span>Registered: {formatDate(b.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {getStatusBadge(b.status)}
                      <span className={styles.commissionRate} style={{ marginTop: '4px' }}>Cut: {b.commissionRate}%</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {b.status === 'PENDING' && (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                          onClick={(e) => handleQuickVerify(e, b.id, b.name)}
                          title="Approve immediately"
                        >
                          <i className="fa-solid fa-check"></i>
                        </button>
                      )}
                      <Link href={`/admin/businesses/${b.id}`} className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

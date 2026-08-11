'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import styles from './dashboard.module.css';

interface PlatformStats {
  totalUsers: number;
  totalBusinesses: number;
  totalBookings: number;
  totalCommissionEarnings: number;
  pendingVerifications: number;
}

interface UserReg {
  id: number;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
}

interface BusinessReg {
  id: number;
  name: string;
  category?: string;
  status: string;
  createdAt: string;
  owner: {
    email: string;
  };
}

interface RecentRegs {
  users: UserReg[];
  businesses: BusinessReg[];
}

interface RevenuePoint {
  month: string;
  bookings: number;
  totalRevenue: number;
  commissionEarnings: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [recent, setRecent] = useState<RecentRegs | null>(null);
  const [trend, setTrend] = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Seeder states
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, recentData, trendData] = await Promise.all([
        apiFetch<PlatformStats>('/api/admin/dashboard/stats'),
        apiFetch<RecentRegs>('/api/admin/dashboard/recent-registrations'),
        apiFetch<RevenuePoint[]>('/api/admin/dashboard/revenue-trend'),
      ]);
      setStats(statsData);
      setRecent(recentData);
      setTrend(trendData);
    } catch (err: any) {
      setError(err.message || 'Could not retrieve admin dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSeedDatabase = async () => {
    setSeeding(true);
    setSeedSuccess(null);
    setError(null);
    try {
      const res: any = await apiFetch('/api/admin/seed', { method: 'POST' });
      setSeedSuccess(res?.message || 'Database seeded successfully!');
      // Reload stats
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to seed mock data. Database may be already seeded.');
    } finally {
      setSeeding(false);
    }
  };

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <div className="spinner" style={{ width: '32px', height: '32px', borderTopColor: 'var(--accent-primary)', borderWidth: '3.5px' }} />
      </div>
    );
  }

  // Draw SVG lines calculation
  const getSvgCoordinates = () => {
    if (trend.length === 0) return { path: '', area: '', points: [] };
    const width = 500;
    const height = 150;
    const padding = 20;

    const maxEarnings = Math.max(...trend.map(d => d.commissionEarnings), 10);
    const minEarnings = 0;
    
    const xStep = (width - padding * 2) / (trend.length - 1);
    const yScale = (height - padding * 2) / (maxEarnings - minEarnings);

    const points = trend.map((d, index) => {
      const x = padding + index * xStep;
      const y = height - padding - (d.commissionEarnings - minEarnings) * yScale;
      return { x, y, value: d.commissionEarnings, label: d.month };
    });

    const path = points.map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const area = `${path} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return { path, area, points };
  };

  const { path: svgPath, area: svgArea, points: svgPoints } = getSvgCoordinates();

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Check if we have seeded data
  const isDatabaseEmpty = stats ? stats.totalUsers <= 1 : true;

  return (
    <div className={styles.dashboardWrapper}>
      {/* Alert Notices */}
      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>{error}</span>
        </div>
      )}

      {seedSuccess && (
        <div className="success-alert">
          <i className="fa-solid fa-circle-check"></i>
          <span>{seedSuccess}</span>
        </div>
      )}

      {stats && stats.pendingVerifications > 0 && (
        <div className={styles.pendingAlertCard}>
          <div className={styles.alertLeft}>
            <div className={styles.alertIcon}>
              <i className="fa-solid fa-bell animate-bounce"></i>
            </div>
            <div className={styles.alertText}>
              <span className={styles.alertTitle}>Businesses Pending Verification</span>
              <span className={styles.alertDesc}>
                There are {stats.pendingVerifications} registered businesses awaiting documentation review and verification.
              </span>
            </div>
          </div>
          <Link href="/admin/businesses?status=PENDING" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
            Go Verify <i className="fa-solid fa-arrow-right"></i>
          </Link>
        </div>
      )}

      {/* Database Seeding Banner */}
      {isDatabaseEmpty && (
        <div className={styles.seederCard}>
          <div className={styles.seederText}>
            <span className={styles.seederTitle}><i className="fa-solid fa-database" style={{ color: 'var(--accent-yellow)', marginRight: '6px' }}></i> Demo Database Seeder</span>
            <p className={styles.seederDesc}>
              Welcome to the platform administrator dashboard. The database currently appears empty. Click the button to automatically seed mock data (users, businesses, categories, bookings, and audit records) to demonstrate full dashboard functionality.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={handleSeedDatabase} disabled={seeding}>
            {seeding ? (
              <>
                <span className="spinner" style={{ borderTopColor: 'var(--accent-primary)', marginRight: '6px' }}></span> Seeding...
              </>
            ) : (
              <>
                <i className="fa-solid fa-wand-magic-sparkles"></i> Seed Database Records
              </>
            )}
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      {stats && (
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div>
              <div className={styles.kpiValue}>${stats.totalCommissionEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className={styles.kpiLabel}>Commission Earnings</div>
            </div>
            <div className={styles.kpiIcon}>
              <i className="fa-solid fa-wallet"></i>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div>
              <div className={styles.kpiValue}>{stats.totalBookings}</div>
              <div className={styles.kpiLabel}>Total Bookings</div>
            </div>
            <div className={styles.kpiIcon}>
              <i className="fa-solid fa-calendar-check"></i>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div>
              <div className={styles.kpiValue}>{stats.totalBusinesses}</div>
              <div className={styles.kpiLabel}>Businesses</div>
            </div>
            <div className={styles.kpiIcon}>
              <i className="fa-solid fa-store"></i>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div>
              <div className={styles.kpiValue}>{stats.totalUsers}</div>
              <div className={styles.kpiLabel}>Platform Users</div>
            </div>
            <div className={styles.kpiIcon}>
              <i className="fa-solid fa-users"></i>
            </div>
          </div>
        </div>
      )}

      {/* SVG Charts Section */}
      {trend.length > 0 && (
        <div className={styles.chartsSection}>
          <div className={styles.chartCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Platform Commission Trends (Last 6 Months)</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estimated USD</span>
            </div>
            <div className={styles.svgChartContainer}>
              <svg viewBox="0 0 500 150" className={styles.svgChart}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-primary)" />
                    <stop offset="100%" stopColor="var(--bg-secondary)" />
                  </linearGradient>
                </defs>
                
                {/* Horizontal Gridlines */}
                <line x1="20" y1="20" x2="480" y2="20" className={styles.chartGrid} />
                <line x1="20" y1="52.5" x2="480" y2="52.5" className={styles.chartGrid} />
                <line x1="20" y1="85" x2="480" y2="85" className={styles.chartGrid} />
                <line x1="20" y1="117.5" x2="480" y2="117.5" className={styles.chartGrid} />
                <line x1="20" y1="130" x2="480" y2="130" className={styles.chartAxis} />

                {/* Shaded Area */}
                {svgArea && <path d={svgArea} className={styles.chartArea} />}

                {/* Line Path */}
                {svgPath && <path d={svgPath} className={styles.chartLine} />}

                {/* Data Points */}
                {svgPoints.map((p, index) => (
                  <circle
                    key={index}
                    cx={p.x}
                    cy={p.y}
                    r="5"
                    className={styles.chartPoint}
                  >
                    <title>{`${p.label}: $${p.value}`}</title>
                  </circle>
                ))}

                {/* Month Labels */}
                {svgPoints.map((p, index) => (
                  <text
                    key={index}
                    x={p.x}
                    y="146"
                    textAnchor="middle"
                    className={styles.chartLabels}
                  >
                    {p.label}
                  </text>
                ))}
              </svg>
            </div>
          </div>

          <div className={styles.chartCard} style={{ justifyContent: 'center', gap: '16px' }}>
            <span className={styles.cardTitle} style={{ textAlign: 'center', marginBottom: '8px' }}>Earning Metrics</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {trend.slice(-3).map((t, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.month} Commission</span>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--accent-primary)' }}>${t.commissionEarnings.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Section */}
      {recent && (
        <div className={styles.listsSection}>
          {/* Recent Users */}
          <div className={styles.listCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Recent User Registrations</span>
              <Link href="/admin/users" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                View All
              </Link>
            </div>
            <table className={styles.simpleTable}>
              <thead>
                <tr>
                  <th>User Email</th>
                  <th>Role</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {recent.users.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No registrations yet.</td>
                  </tr>
                ) : (
                  recent.users.slice(0, 5).map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className={styles.regName}>{u.firstName ? `${u.firstName} ${u.lastName || ''}` : 'New User'}</div>
                        <div className={styles.regEmail}>{u.email}</div>
                      </td>
                      <td>
                        <span className={`badge ${u.role === 'SUPER_ADMIN' ? 'badge-danger' : u.role === 'BUSINESS_OWNER' ? 'badge-primary' : 'badge-success'}`} style={{ fontSize: '0.65rem' }}>
                          {u.role.replace('BUSINESS_', '')}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{formatDate(u.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Recent Businesses */}
          <div className={styles.listCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Recent Businesses</span>
              <Link href="/admin/businesses" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                View All
              </Link>
            </div>
            <table className={styles.simpleTable}>
              <thead>
                <tr>
                  <th>Business Name</th>
                  <th>Status</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {recent.businesses.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No business applications.</td>
                  </tr>
                ) : (
                  recent.businesses.slice(0, 5).map((b) => (
                    <tr key={b.id}>
                      <td>
                        <div className={styles.regName}>{b.name}</div>
                        <div className={styles.regEmail}>{b.category || 'Service Business'} • {b.owner?.email}</div>
                      </td>
                      <td>
                        <span className={`badge ${
                          b.status === 'APPROVED' ? 'badge-success' : 
                          b.status === 'PENDING' ? 'badge-warning' : 'badge-danger'
                        }`} style={{ fontSize: '0.65rem' }}>
                          {b.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{formatDate(b.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import styles from './audit.module.css';

interface AuditUser {
  email: string;
  firstName: string;
  lastName: string;
}

interface AuditLog {
  id: number;
  user?: AuditUser;
  action: string;
  entity: string;
  entityId: number;
  timestamp: string;
  ipAddress?: string;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<AuditLog[]>('/api/admin/audit-logs');
      setLogs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve platform audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getActionClass = (action: string) => {
    const actionUpper = action.toUpperCase();
    if (actionUpper.includes('VERIFY') || actionUpper.includes('APPROVE') || actionUpper.includes('SEED')) {
      return { color: '#059669', icon: 'fa-check-double' };
    }
    if (actionUpper.includes('REJECT') || actionUpper.includes('DELETE') || actionUpper.includes('SUSPEND')) {
      return { color: '#dc2626', icon: 'fa-triangle-exclamation' };
    }
    if (actionUpper.includes('UPDATE') || actionUpper.includes('SETTING') || actionUpper.includes('COMMISSION')) {
      return { color: 'var(--accent-primary)', icon: 'fa-gears' };
    }
    return { color: 'var(--text-main)', icon: 'fa-circle-info' };
  };

  return (
    <div className={styles.auditWrapper}>
      {/* Alert details */}
      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Header bar actions */}
      <div className={styles.headerRow}>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Tracking security events, platform settings changes, and business onboarding approvals.
        </span>
        
        <button className="btn btn-secondary" onClick={loadLogs} style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
          <i className="fa-solid fa-rotate"></i> Refresh Logs
        </button>
      </div>

      {/* Audit Log Table */}
      <div className={styles.tableCard}>
        {loading && logs.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <div className="spinner" style={{ width: '28px', height: '28px', borderTopColor: 'var(--accent-primary)', borderWidth: '3px' }} />
          </div>
        ) : (
          <table className={styles.auditTable}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Administrator</th>
                <th>Action Details</th>
                <th>Affected Entity</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No security events or audit trails logged in the database yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const styleInfo = getActionClass(log.action);
                  
                  return (
                    <tr key={log.id}>
                      <td className={styles.timestamp}>{formatDate(log.timestamp)}</td>
                      <td>
                        {log.user ? (
                          <>
                            <div className={styles.adminInfo}>{log.user.firstName} {log.user.lastName}</div>
                            <div className={styles.adminEmail}>{log.user.email}</div>
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>System / Seeder</span>
                        )}
                      </td>
                      <td className={styles.actionDesc}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i className={`fa-solid ${styleInfo.icon}`} style={{ color: styleInfo.color }}></i>
                          <span>{log.action}</span>
                        </div>
                      </td>
                      <td>
                        {log.entity && log.entityId ? (
                          <span className={styles.entityInfo}>{log.entity} #{log.entityId}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td className={styles.ipAddress}>{log.ipAddress || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

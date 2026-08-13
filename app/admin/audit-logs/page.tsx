'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import DataTable from '@/components/DataTable';
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
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={styles.auditWrapper}>
      <PageHeader
        title="Audit logs"
        subtitle="Track security events, settings changes, and onboarding approvals."
        actions={
          <button type="button" className="btn btn-secondary btn-sm" onClick={loadLogs}>
            <i className="fa-solid fa-rotate" /> Refresh
          </button>
        }
      />

      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" />
          <span>{error}</span>
        </div>
      )}

      {loading && logs.length === 0 ? (
        <Skeleton variant="row" count={8} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon="fa-clipboard-list"
          title="No audit events"
          description="No security events or audit trails have been logged yet."
        />
      ) : (
        <DataTable
          columns={[
            { key: 'time', header: 'Timestamp', render: (log) => formatDate(log.timestamp) },
            {
              key: 'admin',
              header: 'Administrator',
              render: (log) =>
                log.user ? (
                  <div>
                    <strong>
                      {log.user.firstName} {log.user.lastName}
                    </strong>
                    <div className={styles.email}>{log.user.email}</div>
                  </div>
                ) : (
                  <span className={styles.system}>System / Seeder</span>
                ),
            },
            { key: 'action', header: 'Action', render: (log) => log.action },
            {
              key: 'entity',
              header: 'Entity',
              render: (log) =>
                log.entity && log.entityId ? (
                  <span className={styles.entity}>
                    {log.entity} #{log.entityId}
                  </span>
                ) : (
                  '—'
                ),
            },
            { key: 'ip', header: 'IP', render: (log) => log.ipAddress || '—' },
          ]}
          rows={logs}
          rowKey={(log) => log.id}
        />
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import FilterBar from '@/components/FilterBar';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import styles from './users.module.css';

interface User {
  id: number;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  active: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/admin/users?role=${encodeURIComponent(roleFilter)}&search=${encodeURIComponent(searchQuery)}`;
      const data = await apiFetch<User[]>(url);
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const handleToggleActive = async (userId: number, currentStatus: boolean) => {
    setError(null);
    setMessage(null);
    const newStatus = !currentStatus;
    try {
      const updatedUser = await apiFetch<User>(`/api/admin/users/${userId}/status?active=${newStatus}`, {
        method: 'PUT',
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, active: updatedUser.active } : u)));
      setMessage(`User account ${updatedUser.email} ${newStatus ? 'activated' : 'suspended'} successfully.`);
    } catch (err: any) {
      setError(err.message || 'Failed to change user account status.');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setMessage(`User account ${deleteTarget.email} deleted successfully.`);
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete user account.');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={styles.usersWrapper}>
      <PageHeader title="Users" subtitle="Search, filter, and manage platform accounts." />

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

      <form onSubmit={handleSearchSubmit}>
        <FilterBar>
          <input
            type="text"
            className="input-field"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select className="select-field" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            <option value="SUPER_ADMIN">Super Admins</option>
            <option value="BUSINESS_OWNER">Business Owners</option>
            <option value="BUSINESS_STAFF">Business Staff</option>
            <option value="CUSTOMER">Customers</option>
          </select>
          <button type="submit" className="btn btn-primary btn-sm">
            Filter
          </button>
        </FilterBar>
      </form>

      {loading && users.length === 0 ? (
        <Skeleton variant="row" count={6} />
      ) : users.length === 0 ? (
        <EmptyState icon="fa-users" title="No users found" description="No users match your current filter query." />
      ) : (
        <DataTable
          columns={[
            {
              key: 'user',
              header: 'User',
              render: (u) => (
                <div>
                  <strong>{u.firstName ? `${u.firstName} ${u.lastName || ''}` : 'New signup'}</strong>
                  <div className={styles.email}>{u.email}</div>
                </div>
              ),
            },
            {
              key: 'role',
              header: 'Role',
              render: (u) => <span className={styles.role}>{(u.role || 'UNKNOWN').replaceAll('_', ' ')}</span>,
            },
            { key: 'phone', header: 'Phone', render: (u) => u.phoneNumber || '—' },
            { key: 'created', header: 'Registered', render: (u) => formatDate(u.createdAt) },
            {
              key: 'active',
              header: 'Status',
              render: (u) => <StatusBadge status={u.active ? 'ACTIVE' : 'SUSPENDED'} />,
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (u) => (
                <div className={styles.actions}>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    disabled={u.role === 'SUPER_ADMIN'}
                    onClick={() => handleToggleActive(u.id, u.active)}
                  >
                    {u.active ? 'Suspend' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    disabled={u.role === 'SUPER_ADMIN'}
                    onClick={() => setDeleteTarget(u)}
                  >
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
          rows={users}
          rowKey={(u) => u.id}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete user"
        message={`Permanently delete ${deleteTarget?.email}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDeleteUser}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

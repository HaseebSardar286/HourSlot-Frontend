'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
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

  // Fetch when role filter changes
  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  // Handle manual search form submit
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
        method: 'PUT'
      });
      
      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: updatedUser.active } : u));
      setMessage(`User account ${updatedUser.email} ${newStatus ? 'activated' : 'suspended'} successfully.`);
    } catch (err: any) {
      setError(err.message || 'Failed to change user account status.');
    }
  };

  const handleDeleteUser = async (userId: number, email: string) => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete the user account: ${email}? This action cannot be undone.`)) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== userId));
      setMessage(`User account ${email} deleted successfully.`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete user account.');
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="badge badge-danger"><i className="fa-solid fa-crown"></i> Super Admin</span>;
      case 'BUSINESS_OWNER':
        return <span className="badge badge-primary"><i className="fa-solid fa-store"></i> Business Owner</span>;
      case 'BUSINESS_STAFF':
        return <span className="badge badge-info"><i className="fa-solid fa-user-tie"></i> Business Staff</span>;
      case 'CUSTOMER':
        return <span className="badge badge-success"><i className="fa-solid fa-user"></i> Customer</span>;
      default:
        return <span className="badge badge-outline">{role}</span>;
    }
  };

  return (
    <div className={styles.usersWrapper}>
      {/* Alert logs */}
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

      {/* Search & Filter Bar */}
      <form onSubmit={handleSearchSubmit} className={styles.filterBar}>
        <div className={styles.searchGroup}>
          <span className={styles.searchIcon}><i className="fa-solid fa-magnifying-glass"></i></span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search users by name, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className={styles.filterControls}>
          <select
            className={styles.selectRole}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Account Roles</option>
            <option value="SUPER_ADMIN">Super Admins</option>
            <option value="BUSINESS_OWNER">Business Owners</option>
            <option value="BUSINESS_STAFF">Business Staff</option>
            <option value="CUSTOMER">Customers</option>
          </select>
          
          <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.88rem' }}>
            Filter
          </button>
        </div>
      </form>

      {/* User listing Table */}
      <div className={styles.tableCard}>
        {loading && users.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <div className="spinner" style={{ width: '28px', height: '28px', borderTopColor: 'var(--accent-primary)', borderWidth: '3px' }} />
          </div>
        ) : (
          <table className={styles.usersTable}>
            <thead>
              <tr>
                <th>User Details</th>
                <th>Role</th>
                <th>Phone Number</th>
                <th>Date Registered</th>
                <th style={{ textAlign: 'center' }}>Active Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No users match your current filter query.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const nameInitials = `${u.firstName?.charAt(0) || ''}${u.lastName?.charAt(0) || ''}` || 'U';
                  const fullName = u.firstName ? `${u.firstName} ${u.lastName || ''}` : 'New Signup';

                  return (
                    <tr key={u.id}>
                      <td>
                        <div className={styles.userInfoCell}>
                          <div className={styles.avatarCircle}>{nameInitials}</div>
                          <div className={styles.userMeta}>
                            <span className={styles.userName}>{fullName}</span>
                            <span className={styles.userEmail}>{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>{getRoleBadge(u.role)}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{u.phoneNumber || '—'}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{formatDate(u.createdAt)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <label className={styles.switchLabel}>
                          <input
                            type="checkbox"
                            checked={u.active}
                            disabled={u.role === 'SUPER_ADMIN'} // Prevents self-deactivation
                            onChange={() => handleToggleActive(u.id, u.active)}
                          />
                          <span className={styles.slider}></span>
                        </label>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.actionBtns} style={{ justifyContent: 'center' }}>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            disabled={u.role === 'SUPER_ADMIN'}
                            title="Delete User permanently"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
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

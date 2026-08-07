'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import styles from './profile.module.css';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    // Clear the middleware cookie
    document.cookie = 'hourslot_user_session=; path=/; max-age=0';
    logout();
    router.push('/auth/login');
  };

  if (!user) {
    return (
      <div className={styles.profileContainer}>
        <div className="glass-card">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  const initials = `${user.firstName?.charAt(0) || 'U'}${user.lastName?.charAt(0) || ''}`;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return { label: 'Platform Admin', className: 'badge-danger' };
      case 'BUSINESS_OWNER': return { label: 'Business Owner', className: 'badge-primary' };
      case 'BUSINESS_STAFF': return { label: 'Staff', className: 'badge-info' };
      default: return { label: 'Customer', className: 'badge-success' };
    }
  };

  const roleBadge = getRoleBadge(user.role);

  return (
    <div className={styles.profileContainer}>
      <div className={`glass-card ${styles.profileCard}`}>
        <div className={styles.profileHeader}>
          <div className={styles.avatarCircle}>
            {initials}
          </div>
          <h2>{user.firstName} {user.lastName}</h2>
          <span className={`badge ${roleBadge.className}`}>{roleBadge.label}</span>
        </div>

        <hr className={styles.profileDivider} />

        <div className={styles.profileDetails}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>📧 Email</span>
            <span className={styles.detailValue}>{user.email}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>🆔 Account ID</span>
            <span className={styles.detailValue}>#{user.id}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>✅ Status</span>
            <span className={`${styles.detailValue} text-success`}>Active</span>
          </div>
        </div>

        <button className="btn btn-outline btn-block" onClick={handleLogout} style={{ marginTop: '8px' }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

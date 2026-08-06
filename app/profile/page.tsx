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

  const initial = `${user.firstName?.charAt(0) || 'U'}${user.lastName?.charAt(0) || ''}`;

  return (
    <div className={styles.profileContainer}>
      <div className={`glass-card ${styles.profileCard}`}>
        <div className={styles.profileHeader}>
          <div className={styles.avatarCircle}>
            {initial}
          </div>
          <h2>{user.firstName} {user.lastName}</h2>
          <span className="badge badge-primary">{user.role}</span>
        </div>

        <hr className={styles.profileDivider} />

        <div className={styles.profileDetails}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Email Address</span>
            <span className={styles.detailValue}>{user.email}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Account ID</span>
            <span className={styles.detailValue}>#{user.id}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Status</span>
            <span className={`${styles.detailValue} text-success`}>Active</span>
          </div>
        </div>

        <button className="btn btn-secondary btn-block logout-btn" onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </div>
  );
}

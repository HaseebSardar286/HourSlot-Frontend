'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import styles from './profile.module.css';

interface ProfileData {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: string;
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<ProfileData>('/api/users/me')
      .then((data) => {
        setProfile(data);
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setPhoneNumber(data.phoneNumber || '');
      })
      .catch(() => {
        if (user) {
          setProfile({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          });
          setFirstName(user.firstName || '');
          setLastName(user.lastName || '');
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleLogout = () => {
    document.cookie = 'hourslot_user_session=; path=/; max-age=0';
    logout();
    router.push('/auth/login');
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await apiFetch('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          firstName,
          lastName,
          phoneNumber,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      setMessage('Profile updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      const sessionRaw = localStorage.getItem('hourslot_user_session');
      if (sessionRaw) {
        const session = JSON.parse(sessionRaw);
        const next = { ...session, firstName, lastName };
        localStorage.setItem('hourslot_user_session', JSON.stringify(next));
        document.cookie = `hourslot_user_session=${encodeURIComponent(JSON.stringify(next))}; path=/; max-age=86400; SameSite=Lax`;
      }
    } catch (err: any) {
      setError(err?.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className={styles.profileContainer}>
        <div className="glass-card text-center" style={{ padding: '40px' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  const initials = `${firstName?.charAt(0) || 'U'}${lastName?.charAt(0) || ''}`;

  return (
    <div className={styles.profileContainer}>
      <div className={styles.profileHeaderRow}>
        <h2>My Account Settings</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Manage your personal details and login credentials.
        </p>
      </div>

      {message && <div className="success-alert" style={{ marginBottom: 16 }}>{message}</div>}
      {error && <div className="error-alert" style={{ marginBottom: 16 }}>{error}</div>}

      <div className={styles.profileGrid}>
        <div className={styles.leftColumn}>
          <div className={styles.profileCard}>
            <div className={styles.avatarCircle}>{initials}</div>
            <h4>{firstName} {lastName}</h4>
            <span className={styles.roleBadge}>{profile.role.replaceAll('_', ' ')}</span>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              Sign Out Account
            </button>
          </div>
        </div>

        <div className={styles.rightColumn}>
          <form className={styles.detailsCard} onSubmit={handleSave}>
            <h3>Personal Information</h3>
            <div className={styles.detailsGrid}>
              <div className="form-group">
                <label className="form-label" htmlFor="firstName">First Name</label>
                <input id="firstName" className="input-field" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="lastName">Last Name</label>
                <input id="lastName" className="input-field" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address</label>
                <input id="email" className="input-field" value={profile.email} disabled />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="phone">Phone</label>
                <input id="phone" className="input-field" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="currentPass">Current password</label>
                <input id="currentPass" type="password" className="input-field" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="newPass">New password</label>
                <input id="newPass" type="password" className="input-field" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: 16 }} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

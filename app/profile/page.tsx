'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import FormField from '@/components/FormField';
import Skeleton from '@/components/Skeleton';
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
        <PageHeader title="My Account" subtitle="Manage your personal details and login credentials." />
        <div className={styles.skeletonWrap}>
          <Skeleton variant="title" />
          <Skeleton variant="card" height={160} />
          <Skeleton variant="card" height={280} />
        </div>
      </div>
    );
  }

  const initials = `${firstName?.charAt(0) || 'U'}${lastName?.charAt(0) || ''}`;

  return (
    <div className={styles.profileContainer}>
      <PageHeader
        title="My Account"
        subtitle="Manage your personal details and login credentials."
      />

      {message && (
        <div className="success-alert" style={{ marginBottom: 16 }}>
          <i className="fa-solid fa-circle-check" /> {message}
        </div>
      )}
      {error && (
        <div className="error-alert" style={{ marginBottom: 16 }}>
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      <div className={styles.profileGrid}>
        <div className={`surface ${styles.profileCard}`}>
          <div className={styles.avatarCircle}>{initials}</div>
          <h4>
            {firstName} {lastName}
          </h4>
          <span className={styles.roleBadge}>{(profile.role || 'UNKNOWN').replaceAll('_', ' ')}</span>
          <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
            Sign out
          </button>
        </div>

        <form className={`surface ${styles.detailsCard}`} onSubmit={handleSave}>
          <h3>Personal information</h3>
          <div className={styles.detailsGrid}>
            <FormField
              label="First name"
              htmlFor="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <FormField
              label="Last name"
              htmlFor="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <FormField label="Email address" htmlFor="email" value={profile.email} disabled />
            <FormField
              label="Phone"
              htmlFor="phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <FormField
              label="Current password"
              htmlFor="currentPass"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              hint="Required only when changing password"
            />
            <FormField
              label="New password"
              htmlFor="newPass"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className={styles.formActions}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <span className="spinner" /> Saving…
                </>
              ) : (
                'Save changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

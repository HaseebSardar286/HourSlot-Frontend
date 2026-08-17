'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import ConfirmDialog from '@/components/ConfirmDialog';
import styles from './favorites.module.css';

interface Category {
  id: number;
  name: string;
}

interface Business {
  id: number;
  name: string;
  description?: string;
  primaryCategory?: Category;
}

interface Favorite {
  id: number;
  business: Business;
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);

  const loadFavorites = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Favorite[]>('/api/favorites');
      setFavorites(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load favorite list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleRemoveFavorite = async () => {
    if (removeId == null) return;
    setRemoving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/api/favorites/${removeId}`, { method: 'DELETE' });
      setSuccess('Removed from favorites.');
      setFavorites((prev) => prev.filter((f) => f.business.id !== removeId));
      setRemoveId(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to remove favorite.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className={styles.favsContainer}>
      <PageHeader
        title="Favorites"
        subtitle="Quickly access and book with your preferred providers."
        actions={
          <Link href="/profile/explore" className="btn btn-outline btn-sm">
            Explore
          </Link>
        }
      />

      {success && (
        <div className="success-alert" style={{ marginBottom: 16 }}>
          <i className="fa-solid fa-circle-check" /> {success}
        </div>
      )}
      {error && (
        <div className="error-alert" style={{ marginBottom: 16 }}>
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      {loading ? (
        <div className={styles.skeletonGrid}>
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} variant="card" height={200} />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <EmptyState
          icon="fa-heart"
          title="No favorites yet"
          description="Bookmark businesses while exploring to find them here for fast bookings."
          actionLabel="Explore businesses"
          onAction={() => {
            window.location.href = '/profile/explore';
          }}
        />
      ) : (
        <div className={styles.favGrid}>
          {favorites.map((f) => (
            <div key={f.id} className={`surface ${styles.favCard}`}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.categoryTag}>
                    {f.business.primaryCategory?.name || 'General'}
                  </span>
                  <h4>{f.business.name}</h4>
                </div>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => setRemoveId(f.business.id)}
                  title="Remove bookmark"
                  aria-label="Remove from favorites"
                >
                  <i className="fa-solid fa-heart-crack" />
                </button>
              </div>

              {f.business.description && <p className={styles.desc}>{f.business.description}</p>}

              <div className={styles.cardFooter}>
                <Link href={`/profile/business/${f.business.id}`} className="btn btn-primary btn-sm">
                  View &amp; book
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={removeId != null}
        title="Remove favorite?"
        message="This business will be removed from your favorites list."
        confirmLabel="Remove"
        danger
        loading={removing}
        onConfirm={handleRemoveFavorite}
        onCancel={() => setRemoveId(null)}
      />
    </div>
  );
}

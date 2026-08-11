'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
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

  const handleRemoveFavorite = async (businessId: number) => {
    if (!confirm('Remove this business from your favorites?')) return;
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/api/favorites/${businessId}`, {
        method: 'DELETE',
      });
      setSuccess('Removed from favorites.');
      setFavorites((prev) => prev.filter((f) => f.business.id !== businessId));
    } catch (err: any) {
      setError(err?.message || 'Failed to remove favorite.');
    }
  };

  return (
    <div className={styles.favsContainer}>
      <div className={styles.headerRow}>
        <h2>My Favorite Businesses</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Quickly access and book appointments with your preferred providers.</p>
      </div>

      {success && <div className="success-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-circle-check"></i> {success}</div>}
      {error && <div className="error-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-triangle-exclamation"></i> {error}</div>}

      {loading ? (
        <div className={styles.loaderContainer}>
          <div className="spinner" />
        </div>
      ) : favorites.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❤️</div>
          <h3>No Favorites Added</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Bookmark businesses to find them here for fast bookings.</p>
          <Link href="/profile/explore" className="btn btn-primary">
            Explore Businesses
          </Link>
        </div>
      ) : (
        <div className={styles.favGrid}>
          {favorites.map((f) => (
            <div key={f.id} className={`glass-card ${styles.favCard}`}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.categoryTag}>
                    {f.business.primaryCategory?.name || 'General'}
                  </span>
                  <h4>{f.business.name}</h4>
                </div>
                <button 
                  className={styles.removeBtn}
                  onClick={() => handleRemoveFavorite(f.business.id)}
                  title="Remove bookmark"
                >
                  <i className="fa-solid fa-heart-broken"></i>
                </button>
              </div>

              {f.business.description && (
                <p className={styles.desc}>{f.business.description}</p>
              )}

              <div className={styles.cardFooter}>
                <Link href={`/profile/business/${f.business.id}`} className="btn btn-outline btn-sm" style={{ flex: 1, textAlign: 'center' }}>
                  View Profile
                </Link>
                <Link href={`/profile/book/${f.business.id}`} className="btn btn-primary btn-sm" style={{ flex: 1, textAlign: 'center' }}>
                  Book Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

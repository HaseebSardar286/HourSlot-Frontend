'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import type { Branch, Category } from '@/lib/types';
import EmptyState from '@/components/EmptyState';
import styles from './explore.module.css';

interface ExploreBranch extends Branch {
  averageRating?: number;
  distanceKm?: number;
}

export default function ExplorePage() {
  const [branches, setBranches] = useState<ExploreBranch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState('Near you');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  const enrichRatings = async (list: ExploreBranch[]) => {
    const uniqueBiz = Array.from(new Set(list.map((b) => b.business.id)));
    const ratingMap = new Map<number, number>();
    await Promise.all(
      uniqueBiz.slice(0, 12).map(async (id) => {
        try {
          const profile = await apiFetch<{ averageRating: number }>(`/api/discover/business/${id}`, {
            skipAuth: true,
          });
          ratingMap.set(id, profile.averageRating || 0);
        } catch {
          ratingMap.set(id, 0);
        }
      })
    );
    return list.map((b) => ({
      ...b,
      averageRating: ratingMap.get(b.business.id) ?? 0,
    }));
  };

  const loadNearby = useCallback(async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    try {
      const [branchData, catData, favData] = await Promise.all([
        apiFetch<ExploreBranch[]>(`/api/discover/nearby?lat=${lat}&lon=${lon}&radius=50000`, {
          skipAuth: true,
        }),
        apiFetch<Category[]>('/api/discover/categories', { skipAuth: true }),
        apiFetch<{ business: { id: number } }[]>('/api/favorites').catch(() => []),
      ]);
      const withDist = branchData.map((b) => ({
        ...b,
        distanceKm:
          typeof b.distanceMeters === 'number'
            ? b.distanceMeters / 1000
            : undefined,
      }));
      setBranches(await enrichRatings(withDist));
      setCategories(catData);
      setFavorites(favData.map((f) => f.business.id));
      setIsSearchActive(false);
      setLocationLabel('Near you');
    } catch (err: any) {
      setError(err?.message || 'Failed to load nearby businesses.');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSearch = async (queryVal = '', isSearching = false) => {
    setLoading(true);
    setError(null);
    try {
      const searchUrl = `/api/discover/search?q=${encodeURIComponent(queryVal)}`;
      const [branchData, catData, favData] = await Promise.all([
        apiFetch<ExploreBranch[]>(searchUrl, { skipAuth: true }),
        apiFetch<Category[]>('/api/discover/categories', { skipAuth: true }),
        apiFetch<{ business: { id: number } }[]>('/api/favorites').catch(() => []),
      ]);
      setBranches(await enrichRatings(branchData));
      setCategories(catData);
      setFavorites(favData.map((f) => f.business.id));
      setIsSearchActive(isSearching || queryVal !== '');
    } catch (err: any) {
      setError(err?.message || 'Failed to load explore data.');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      loadSearch('');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setCoords(next);
        loadNearby(next.lat, next.lon);
      },
      () => {
        loadSearch('');
      },
      { timeout: 8000 }
    );
  }, [loadNearby]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadSearch(searchQuery, true);
  };

  const handleCategoryClick = (catName: string) => {
    setSearchQuery(catName);
    loadSearch(catName, true);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchActive(false);
    if (coords) loadNearby(coords.lat, coords.lon);
    else loadSearch('');
  };

  const handleToggleFavorite = async (e: React.MouseEvent, businessId: number) => {
    e.stopPropagation();
    e.preventDefault();
    const isFav = favorites.includes(businessId);
    setError(null);
    setSuccess(null);
    try {
      if (isFav) {
        await apiFetch(`/api/favorites/${businessId}`, { method: 'DELETE' });
        setFavorites((prev) => prev.filter((id) => id !== businessId));
        setSuccess('Removed from favorites.');
      } else {
        await apiFetch(`/api/favorites/${businessId}`, { method: 'POST' });
        setFavorites((prev) => [...prev, businessId]);
        setSuccess('Added to favorites!');
      }
    } catch {
      setError('Could not update favorite status.');
    }
  };

  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('health') || lower.includes('medical') || lower.includes('dentist')) return 'fa-solid fa-heart-pulse';
    if (lower.includes('beauty') || lower.includes('spa') || lower.includes('wellness')) return 'fa-solid fa-spa';
    if (lower.includes('fitness') || lower.includes('yoga') || lower.includes('gym')) return 'fa-solid fa-dumbbell';
    if (lower.includes('salon') || lower.includes('hair') || lower.includes('barber')) return 'fa-solid fa-scissors';
    if (lower.includes('pet') || lower.includes('dog') || lower.includes('vet')) return 'fa-solid fa-paw';
    if (lower.includes('home') || lower.includes('service') || lower.includes('repair')) return 'fa-solid fa-wrench';
    return 'fa-solid fa-shapes';
  };

  const coverFor = (b: ExploreBranch) => {
    const gallery = b.business.galleryUrls?.split(',').map((u) => u.trim()).filter(Boolean);
    if (gallery && gallery.length > 0) return gallery[0];
    if (b.business.logoUrl) return b.business.logoUrl;
    return null;
  };

  const renderCard = (b: ExploreBranch) => {
    const isFav = favorites.includes(b.business.id);
    const cover = coverFor(b);
    return (
      <Link href={`/profile/business/${b.business.id}`} key={b.id} className={styles.popularCard}>
        <div className={styles.popularCardImageWrapper}>
          {cover ? (
            <img src={cover} alt={b.business.name} />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                minHeight: 160,
                background: 'linear-gradient(135deg, rgba(26,138,138,0.2), rgba(91,184,140,0.35))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
                fontWeight: 800,
                fontSize: '1.4rem',
              }}
            >
              {b.business.name.slice(0, 1)}
            </div>
          )}
          {typeof b.averageRating === 'number' && b.averageRating > 0 && (
            <div className={styles.ratingBadge}>
              <i className="fa-solid fa-star"></i> {b.averageRating.toFixed(1)}
            </div>
          )}
          <button
            type="button"
            className={`${styles.cardFavBtn} ${isFav ? styles.isFav : ''}`}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
            onClick={(e) => handleToggleFavorite(e, b.business.id)}
          >
            <i className={`fa-${isFav ? 'solid' : 'regular'} fa-heart`}></i>
          </button>
        </div>
        <div className={styles.popularCardContent}>
          <h4>{b.business.name}</h4>
          <p className={styles.categorySub}>
            {b.business.primaryCategory?.name || 'Service'} · {b.name}
          </p>
          <p className={styles.distanceText}>
            <i className="fa-solid fa-location-dot"></i>{' '}
            {typeof b.distanceKm === 'number'
              ? `${b.distanceKm.toFixed(1)} km away`
              : b.address}
          </p>
        </div>
      </Link>
    );
  };

  return (
    <div className={styles.exploreContainer}>
      <div className={styles.heroSection}>
        <h1>Find and book local services.</h1>
        <p>Discover approved businesses {locationLabel.toLowerCase()}. Book appointments instantly.</p>

        <form onSubmit={handleSearchSubmit} className={styles.searchBar}>
          <div className={styles.searchInputWrapper}>
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder="Dentists, Salons, Yoga..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search services"
            />
          </div>
          <button type="submit" className={styles.searchBtn}>Search</button>
        </form>
      </div>

      {error && (
        <div className="error-alert" style={{ marginBottom: '24px' }}>
          <i className="fa-solid fa-triangle-exclamation"></i> {error}
        </div>
      )}
      {success && (
        <div className="success-alert" style={{ marginBottom: '24px' }}>
          <i className="fa-solid fa-circle-check"></i> {success}
        </div>
      )}

      <div className={styles.sectionArea}>
        <h3 className={styles.sectionTitle}>Browse by Category</h3>
        <div className={styles.categoryGrid}>
          {categories.length > 0 ? (
            categories.map((cat) => (
              <button
                type="button"
                key={cat.id}
                className={styles.categoryCard}
                onClick={() => handleCategoryClick(cat.name)}
              >
                <div className={styles.catIconCircle}>
                  <i className={getCategoryIcon(cat.name)}></i>
                </div>
                <span>{cat.name}</span>
              </button>
            ))
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>No categories available yet.</p>
          )}
        </div>
      </div>

      <div className={styles.sectionArea}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
            {isSearchActive ? `Results for “${searchQuery}”` : `Popular ${locationLabel.toLowerCase()}`}
          </h3>
          {isSearchActive && (
            <button type="button" onClick={handleClearSearch} className={styles.clearSearchBtn}>
              <i className="fa-solid fa-xmark"></i> Clear Search
            </button>
          )}
        </div>

        {loading ? (
          <div className={styles.loaderContainer}>
            <div className="spinner" />
          </div>
        ) : branches.length === 0 ? (
          <EmptyState
            icon="fa-store-slash"
            title="No businesses found"
            description="Try another search, or check back after more businesses are approved."
            actionLabel="Refresh"
            onAction={() => (coords ? loadNearby(coords.lat, coords.lon) : loadSearch(''))}
          />
        ) : (
          <div className={styles.popularGrid}>{branches.map(renderCard)}</div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo, useRef, type FormEvent } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { loginHref } from '@/lib/auth-redirect';
import type { Branch, Category } from '@/lib/types';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import styles from './explore.module.css';

const LocationMap = dynamic(() => import('@/components/LocationMap'), {
  ssr: false,
  loading: () => <Skeleton variant="card" height={280} />,
});

interface ExploreBranch extends Branch {
  averageRating?: number;
  distanceKm?: number;
}

const DISTANCES = [5, 10, 25, 50];

export default function ExplorePage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
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
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(50);
  const [sortBy, setSortBy] = useState<'recommended' | 'rating'>('recommended');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const bootstrapped = useRef(false);

  const enrichRatings = async (list: ExploreBranch[]) => {
    const uniqueBiz = Array.from(
      new Set(list.map((b) => b.business?.id).filter((id): id is number => typeof id === 'number'))
    );
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
      averageRating: (b.business?.id != null ? ratingMap.get(b.business.id) : undefined) ?? 0,
    }));
  };

  const loadNearby = useCallback(async (lat: number, lon: number, queryVal = '', radius = radiusKm) => {
    setLoading(true);
    setError(null);
    try {
      const nearbyUrl = `/api/discover/nearby?lat=${lat}&lon=${lon}&radius=${radius * 1000}${queryVal ? `&q=${encodeURIComponent(queryVal)}` : ''}`;
      const [branchData, catData, favData] = await Promise.all([
        apiFetch<ExploreBranch[]>(nearbyUrl, { skipAuth: true }),
        apiFetch<Category[]>('/api/discover/categories', { skipAuth: true }),
        apiFetch<{ business: { id: number } }[]>('/api/favorites').catch(() => []),
      ]);
      const withDist = branchData.map((b) => ({
        ...b,
        distanceKm: typeof b.distanceMeters === 'number' ? b.distanceMeters / 1000 : undefined,
      }));
      const rated = await enrichRatings(withDist);
      setBranches(rated);
      setCategories(catData);
      setFavorites(favData.map((f) => f.business.id));
      setIsSearchActive(queryVal !== '');
      setLocationLabel('Near you');
      if (rated[0]) setSelectedId(rated[0].id);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to load nearby businesses.');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, [radiusKm]);

  const loadSearch = useCallback(async (queryVal = '', isSearching = false) => {
    setLoading(true);
    setError(null);
    try {
      const searchUrl = `/api/discover/search?q=${encodeURIComponent(queryVal)}`;
      const [branchData, catData, favData] = await Promise.all([
        apiFetch<ExploreBranch[]>(searchUrl, { skipAuth: true }),
        apiFetch<Category[]>('/api/discover/categories', { skipAuth: true }),
        apiFetch<{ business: { id: number } }[]>('/api/favorites').catch(() => []),
      ]);
      const rated = await enrichRatings(branchData);
      setBranches(rated);
      setCategories(catData);
      setFavorites(favData.map((f) => f.business.id));
      setIsSearchActive(isSearching || queryVal !== '');
      if (rated[0]) setSelectedId(rated[0].id);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to load explore data.');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategoriesOnly = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const catData = await apiFetch<Category[]>('/api/discover/categories', { skipAuth: true });
      setCategories(catData);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerSearchOrNearby = useCallback((query: string, radius = radiusKm) => {
    if (coords) {
      loadNearby(coords.lat, coords.lon, query, radius);
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setCoords(next);
          loadNearby(next.lat, next.lon, query, radius);
        },
        (err) => {
          console.warn('Geolocation failed or denied:', err);
          loadSearch(query, true);
        },
        { timeout: 8000 }
      );
    } else {
      loadSearch(query, true);
    }
  }, [coords, loadNearby, loadSearch, radiusKm]);

  useEffect(() => {
    if (authLoading || bootstrapped.current) return;
    bootstrapped.current = true;

    let q = '';
    try {
      q = new URLSearchParams(window.location.search).get('q') || '';
      if (!q) {
        const raw = sessionStorage.getItem('hourslot_explore_q');
        if (raw) {
          sessionStorage.removeItem('hourslot_explore_q');
          const parsed = JSON.parse(raw);
          q = typeof parsed === 'string' ? parsed : parsed?.q || '';
        }
      }
    } catch {
      q = '';
    }

    if (q) {
      setSearchQuery(q);
      setActiveCategory(q);
      triggerSearchOrNearby(q);
      return;
    }

    if (isAuthenticated) {
      triggerSearchOrNearby('');
      return;
    }

    loadCategoriesOnly();
  }, [authLoading, isAuthenticated, loadCategoriesOnly, triggerSearchOrNearby]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setActiveCategory(null);
    triggerSearchOrNearby(searchQuery);
  };

  const handleCategoryClick = (catName: string) => {
    setSearchQuery(catName);
    setActiveCategory(catName);
    triggerSearchOrNearby(catName);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchActive(false);
    setActiveCategory(null);
    if (coords) {
      loadNearby(coords.lat, coords.lon, '');
    } else {
      loadSearch('', false);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, businessId: number) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isAuthenticated) {
      router.push(loginHref(`${window.location.pathname}${window.location.search}`));
      return;
    }
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

  const startVoice = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => { lang: string; start: () => void; onresult: ((ev: { results: { 0: { 0: { transcript: string } } } }) => void) | null };
      webkitSpeechRecognition?: new () => { lang: string; start: () => void; onresult: ((ev: { results: { 0: { 0: { transcript: string } } } }) => void) | null };
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.onresult = (ev) => {
      const text = ev.results[0][0].transcript;
      setSearchQuery(text);
      triggerSearchOrNearby(text);
    };
    rec.start();
  };

  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('health') || lower.includes('medical') || lower.includes('dentist'))
      return 'fa-solid fa-heart-pulse';
    if (lower.includes('beauty') || lower.includes('spa') || lower.includes('wellness'))
      return 'fa-solid fa-spa';
    if (lower.includes('fitness') || lower.includes('yoga') || lower.includes('gym'))
      return 'fa-solid fa-dumbbell';
    if (lower.includes('salon') || lower.includes('hair') || lower.includes('barber'))
      return 'fa-solid fa-scissors';
    if (lower.includes('pet') || lower.includes('dog') || lower.includes('vet')) return 'fa-solid fa-paw';
    if (lower.includes('home') || lower.includes('service') || lower.includes('repair'))
      return 'fa-solid fa-wrench';
    return 'fa-solid fa-shapes';
  };

  const coverFor = (b: ExploreBranch) => {
    const gallery = b.business.galleryUrls
      ?.split(',')
      .map((u) => u.trim())
      .filter(Boolean);
    if (gallery && gallery.length > 0) return gallery[0];
    if (b.business.logoUrl) return b.business.logoUrl;
    return null;
  };

  const sortedBranches = useMemo(() => {
    const list = [...branches];
    if (sortBy === 'rating') {
      list.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    }
    return list;
  }, [branches, sortBy]);

  const mapMarkers = useMemo(
    () =>
      sortedBranches
        .filter((b) => Number.isFinite(b.latitude) && Number.isFinite(b.longitude))
        .slice(0, 40)
        .map((b) => ({
          id: b.id,
          lat: b.latitude as number,
          lng: b.longitude as number,
          label: `<strong>${b.business?.name || b.name}</strong><br/>${b.address || b.name}`,
        })),
    [sortedBranches]
  );

  const selected = sortedBranches.find((b) => b.id === selectedId) || null;

  if (authLoading) {
    return (
      <div className={styles.dashExplore} style={{ placeItems: 'center' }}>
        <Skeleton variant="card" height={220} />
      </div>
    );
  }

  const renderGuestCard = (b: ExploreBranch) => {
    if (!b.business) return null;
    const isFav = favorites.includes(b.business.id);
    const cover = coverFor(b);
    return (
      <Link href={`/profile/business/${b.business.id}`} key={b.id} className={styles.popularCard}>
        <div className={styles.popularCardImageWrapper}>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={b.business.name} />
          ) : (
            <div className={styles.coverFallback}>{b.business.name.slice(0, 1)}</div>
          )}
          {typeof b.averageRating === 'number' && b.averageRating > 0 && (
            <div className={styles.ratingBadge}>
              <i className="fa-solid fa-star" /> {b.averageRating.toFixed(1)}
            </div>
          )}
          <button
            type="button"
            className={`${styles.cardFavBtn} ${isFav ? styles.isFav : ''}`}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
            onClick={(e) => handleToggleFavorite(e, b.business.id)}
          >
            <i className={`fa-${isFav ? 'solid' : 'regular'} fa-heart`} />
          </button>
        </div>
        <div className={styles.popularCardContent}>
          <h4>{b.business.name}</h4>
          <p className={styles.categorySub}>
            {b.business.primaryCategory?.name || 'Service'} · {b.name}
          </p>
          <p className={styles.distanceText}>
            <i className="fa-solid fa-location-dot" />{' '}
            {typeof b.distanceKm === 'number' ? `${b.distanceKm.toFixed(1)} km away` : b.address}
          </p>
        </div>
      </Link>
    );
  };

  const renderDashCard = (b: ExploreBranch) => {
    if (!b.business) return null;
    const isFav = favorites.includes(b.business.id);
    const cover = coverFor(b);
    const cat = b.business.primaryCategory?.name || 'Service';
    return (
      <article
        key={b.id}
        className={`${styles.resultCard} ${selectedId === b.id ? styles.resultCardOn : ''}`}
        onClick={() => setSelectedId(b.id)}
      >
        <div className={styles.resultThumb}>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" />
          ) : (
            <div className={styles.coverFallback}>{b.business.name.slice(0, 1)}</div>
          )}
          {typeof b.averageRating === 'number' && b.averageRating > 0 && (
            <span className={styles.thumbRating}>
              <i className="fa-solid fa-star" /> {b.averageRating.toFixed(1)}
            </span>
          )}
        </div>
        <div className={styles.resultBody}>
          <div className={styles.resultTop}>
            <span className={styles.catPill}>{cat}</span>
            <button
              type="button"
              className={`${styles.heartBtn} ${isFav ? styles.isFav : ''}`}
              aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
              onClick={(e) => handleToggleFavorite(e, b.business.id)}
            >
              <i className={`fa-${isFav ? 'solid' : 'regular'} fa-heart`} />
            </button>
          </div>
          <Link href={`/profile/business/${b.business.id}`} className={styles.resultName} onClick={(e) => e.stopPropagation()}>
            {b.business.name}
          </Link>
          <p className={styles.resultAddr}>
            {b.address || b.name}
            {typeof b.distanceKm === 'number' ? ` · ${b.distanceKm.toFixed(1)} km` : ''}
          </p>
          <div className={styles.resultMeta}>
            <Link
              href={`/profile/business/${b.business.id}`}
              className={styles.bookLink}
              onClick={(e) => e.stopPropagation()}
            >
              View &amp; book
            </Link>
            <span className={styles.nextSlot}>Choose a service</span>
          </div>
        </div>
      </article>
    );
  };

  if (isAuthenticated) {
    return (
      <div className={styles.dashExplore}>
        <section className={styles.findPane}>
          <header className={styles.findHead}>
            <div>
              <h1>Explore</h1>
              <p>Nearby businesses with real open slots</p>
            </div>
            <span className={styles.locChip}>
              <i className="fa-solid fa-location-dot" aria-hidden />
              {locationLabel}
            </span>
          </header>

          <form onSubmit={handleSearchSubmit} className={styles.findSearch}>
            <i className="fa-solid fa-magnifying-glass" aria-hidden />
            <input
              type="text"
              placeholder="Search businesses, services, or categories"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search businesses and services"
            />
            <button type="button" className={styles.micBtn} onClick={startVoice} aria-label="Voice search">
              <i className="fa-solid fa-microphone" />
            </button>
            <button type="submit" className={styles.searchGo}>
              Search
            </button>
          </form>

          <div className={styles.filterRow}>
            <button
              type="button"
              className={`${styles.filterMain} ${filtersOpen ? styles.filterMainOn : ''}`}
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <i className="fa-solid fa-sliders" /> Filters
            </button>
            <label className={styles.filterPill}>
              Distance
              <select
                value={radiusKm}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setRadiusKm(next);
                  triggerSearchOrNearby(searchQuery, next);
                }}
                aria-label="Distance"
              >
                {DISTANCES.map((d) => (
                  <option key={d} value={d}>
                    {d} km
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.filterPill}>
              Sort
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recommended' | 'rating')}
                aria-label="Sort by"
              >
                <option value="recommended">Recommended</option>
                <option value="rating">Rating</option>
              </select>
            </label>
          </div>

          {filtersOpen && categories.length > 0 && (
            <div className={styles.categoryRow}>
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  className={`${styles.categoryChip} ${activeCategory === cat.name ? styles.categoryChipActive : ''}`}
                  onClick={() => handleCategoryClick(cat.name)}
                >
                  <i className={getCategoryIcon(cat.name)} />
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          <div className={styles.resultsBar}>
            <span>Showing {sortedBranches.length} results</span>
            <span>
              Sort by: {sortBy === 'rating' ? 'Rating' : 'Recommended'}
              {isSearchActive && (
                <button type="button" className={styles.clearInline} onClick={handleClearSearch}>
                  Clear
                </button>
              )}
            </span>
          </div>

          {error && (
            <div className="error-alert" style={{ marginBottom: 12 }}>
              <i className="fa-solid fa-triangle-exclamation" /> {error}
            </div>
          )}
          {success && (
            <div className="success-alert" style={{ marginBottom: 12 }}>
              <i className="fa-solid fa-circle-check" /> {success}
            </div>
          )}

          <div className={styles.resultList}>
            {loading ? (
              [1, 2, 3, 4].map((n) => (
                <div key={n} className={styles.resultCard}>
                  <Skeleton variant="card" height={92} />
                </div>
              ))
            ) : sortedBranches.length === 0 ? (
              <EmptyState
                icon="fa-store-slash"
                title="No businesses found"
                description="Try another search or a wider distance."
                actionLabel="Refresh"
                onAction={() => triggerSearchOrNearby(searchQuery)}
              />
            ) : (
              sortedBranches.map(renderDashCard)
            )}
          </div>
        </section>

        <section className={styles.mapPane}>
          <LocationMap
            markers={mapMarkers}
            userLocation={coords ? { lat: coords.lat, lng: coords.lon } : null}
            height="100%"
            selectedId={selectedId}
            onMarkerClick={(id) => setSelectedId(Number(id))}
            showControls
            onLocate={() => triggerSearchOrNearby(searchQuery)}
            scrollWheelZoom
            className={styles.fillMap}
          />
          {selected?.business && (
            <div className={styles.mapCard}>
              <div className={styles.mapCardThumb}>
                {coverFor(selected) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverFor(selected) || ''} alt="" />
                ) : (
                  <div className={styles.coverFallback}>{selected.business.name.slice(0, 1)}</div>
                )}
              </div>
              <div className={styles.mapCardBody}>
                <Link href={`/profile/business/${selected.business.id}`}>{selected.business.name}</Link>
                <p>{selected.address || selected.name}</p>
                <span>
                  {typeof selected.averageRating === 'number' && selected.averageRating > 0
                    ? `${selected.averageRating.toFixed(1)} · `
                    : ''}
                  {typeof selected.distanceKm === 'number' ? `${selected.distanceKm.toFixed(1)} km` : 'Nearby'}
                </span>
              </div>
              <Link href={`/profile/business/${selected.business.id}`} className={styles.mapCardBook}>
                View
              </Link>
              <button type="button" className={styles.mapCardClose} onClick={() => setSelectedId(null)} aria-label="Close">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          )}
        </section>
      </div>
    );
  }

  const isInitialState = !activeCategory && !isSearchActive;

  if (isInitialState) {
    return (
      <div className={styles.exploreContainer}>
        {error && (
          <div className="error-alert" style={{ marginBottom: 20, marginTop: 10 }}>
            <i className="fa-solid fa-triangle-exclamation" /> {error}
          </div>
        )}
        <div className={styles.categoriesLandingSection}>
          <h2 className={styles.landingTitle}>Choose a category to get started</h2>
          <p className={styles.landingSubtitle}>Browse nearby businesses by the type of service you need, then pick a real open slot.</p>

          {loading && categories.length === 0 ? (
            <div className={styles.categoryGrid}>
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className={styles.categoryCard} style={{ pointerEvents: 'none' }}>
                  <Skeleton width={60} height={60} className={styles.skeletonCircle} />
                  <div style={{ height: 18 }} />
                  <Skeleton variant="title" width="60%" />
                  <div style={{ height: 8 }} />
                  <Skeleton variant="text" width="80%" />
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.categoryGrid}>
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  className={styles.categoryCard}
                  onClick={() => handleCategoryClick(cat.name)}
                >
                  <div className={styles.categoryCardIcon}>
                    <i className={getCategoryIcon(cat.name)} />
                  </div>
                  <h3>{cat.name}</h3>
                  <p>Find nearby {cat.name.toLowerCase()} businesses</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.exploreContainer}>
      <div className={styles.browseCompose}>
        <h1>Find and book local services</h1>
        <p>Discover approved businesses {locationLabel.toLowerCase()}. Search or browse by category.</p>

        <form onSubmit={handleSearchSubmit} className={styles.searchBar}>
          <div className={styles.searchInputWrapper}>
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              placeholder="Salons, studios, clinics, repairs…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search services"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
        </form>

        {categories.length > 0 && (
          <div className={styles.categoryRow}>
            {categories.map((cat) => (
              <button
                type="button"
                key={cat.id}
                className={`${styles.categoryChip} ${activeCategory === cat.name ? styles.categoryChipActive : ''}`}
                onClick={() => handleCategoryClick(cat.name)}
              >
                <i className={getCategoryIcon(cat.name)} />
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="error-alert" style={{ marginBottom: 20 }}>
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}
      {success && (
        <div className="success-alert" style={{ marginBottom: 20 }}>
          <i className="fa-solid fa-circle-check" /> {success}
        </div>
      )}

      <div className={styles.sectionArea}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            {isSearchActive
              ? `Results for “${searchQuery}”`
              : `Popular ${locationLabel.toLowerCase()}`}
          </h2>
          {isSearchActive && (
            <button type="button" onClick={handleClearSearch} className={styles.clearSearchBtn}>
              <i className="fa-solid fa-xmark" /> Clear
            </button>
          )}
        </div>

        {!loading && (mapMarkers.length > 0 || coords) && (
          <div className={styles.exploreMap}>
            <LocationMap
              markers={mapMarkers}
              userLocation={coords ? { lat: coords.lat, lng: coords.lon } : null}
              height={300}
            />
            <p className={styles.mapLegend}>
              <span className={styles.youDot} aria-hidden /> You are here
              {mapMarkers.length > 0 ? ' · Pins are nearby businesses' : ''}
            </p>
          </div>
        )}

        {loading ? (
          <div className={styles.popularGrid}>
            {[1, 2, 3].map((n) => (
              <div key={n} className={styles.skeletonCard}>
                <Skeleton variant="card" height={150} />
                <div className={styles.skeletonBody}>
                  <Skeleton variant="title" width="70%" />
                  <Skeleton width="50%" />
                  <Skeleton width="80%" />
                </div>
              </div>
            ))}
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
          <div className={styles.popularGrid}>{sortedBranches.map(renderGuestCard)}</div>
        )}
      </div>
    </div>
  );
}

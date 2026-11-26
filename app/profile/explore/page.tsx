'use client';

import { useState, useEffect, useCallback, useMemo, useRef, type FormEvent, type PointerEvent } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { loginHref } from '@/lib/auth-redirect';
import type { Branch, Category } from '@/lib/types';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import CustomSelect from '@/components/CustomSelect';
import styles from './explore.module.css';

const LocationMap = dynamic(() => import('@/components/LocationMap'), {
  ssr: false,
  loading: () => <Skeleton variant="card" height={280} />,
});

interface ExploreBranch extends Branch {
  averageRating?: number;
  distanceKm?: number;
}

function branchProfileHref(branch: ExploreBranch) {
  const slug = branch.business?.slug;
  if (slug) return `/b/${encodeURIComponent(slug)}`;
  return `/profile/business/${branch.business.id}?branchId=${branch.id}`;
}

function withExploreMeta(list: ExploreBranch[]): ExploreBranch[] {
  return list.map((b) => ({
    ...b,
    averageRating: b.business?.rating ?? b.averageRating ?? 0,
    distanceKm: typeof b.distanceMeters === 'number' ? b.distanceMeters / 1000 : b.distanceKm,
  }));
}

const DISTANCES = [5, 10, 25, 50];

function discoveryFilterQs(filters: {
  serviceMode: string;
  listingMode: string;
  verifiedOnly: boolean;
  geoAreaId: string;
}) {
  const params = new URLSearchParams();
  if (filters.serviceMode) params.set('serviceMode', filters.serviceMode);
  if (filters.listingMode) params.set('listingMode', filters.listingMode);
  if (filters.verifiedOnly) params.set('verified', 'true');
  if (filters.geoAreaId) params.set('geoAreaId', filters.geoAreaId);
  const encoded = params.toString();
  return encoded ? `&${encoded}` : '';
}

export default function ExplorePage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [branches, setBranches] = useState<ExploreBranch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState('Near you');
  const [coords, setCoords] = useState<{ lat: number; lon: number; accuracy?: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locNotice, setLocNotice] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(50);
  const [sortBy, setSortBy] = useState<'recommended' | 'rating'>('recommended');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [serviceMode, setServiceMode] = useState('');
  const [listingMode, setListingMode] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [geoAreaId, setGeoAreaId] = useState('');
  const [geoAreas, setGeoAreas] = useState<{ id: number; name: string; city?: string }[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const bootstrapped = useRef(false);
  const splitRef = useRef<HTMLDivElement>(null);
  const draggingSplit = useRef(false);
  const listPctRef = useRef(52);
  const [listPct, setListPct] = useState(52);
  const [splitting, setSplitting] = useState(false);

  const loadNearby = useCallback(async (lat: number, lon: number, queryVal = '', radius = radiusKm) => {
    setLoading(true);
    setError(null);
    try {
      const nearbyUrl = `/api/discover/nearby?lat=${lat}&lon=${lon}&radius=${radius * 1000}${queryVal ? `&q=${encodeURIComponent(queryVal)}` : ''}${discoveryFilterQs({ serviceMode, listingMode, verifiedOnly, geoAreaId })}`;
      const favPromise = isAuthenticated
        ? apiFetch<{ business: { id: number } }[]>('/api/favorites').catch(() => [])
        : Promise.resolve([] as { business: { id: number } }[]);
      const [branchData, catData, favData] = await Promise.all([
        apiFetch<ExploreBranch[]>(nearbyUrl, { skipAuth: true }),
        apiFetch<Category[]>('/api/discover/categories', { skipAuth: true }),
        favPromise,
      ]);
      const rated = withExploreMeta(branchData);
      setBranches(rated);
      setCategories(catData);
      setFavorites(favData.map((f) => f.business?.id).filter((id): id is number => id != null));
      setIsSearchActive(queryVal !== '');
      setLocationLabel('Near you');
      setSelectedId(null);
      setHoveredId(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to load nearby businesses.');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, [radiusKm, isAuthenticated, serviceMode, listingMode, verifiedOnly, geoAreaId]);

  const loadSearch = useCallback(async (queryVal = '', isSearching = false) => {
    setLoading(true);
    setError(null);
    try {
      const searchUrl = `/api/discover/search?q=${encodeURIComponent(queryVal)}${discoveryFilterQs({ serviceMode, listingMode, verifiedOnly, geoAreaId })}`;
      const favPromise = isAuthenticated
        ? apiFetch<{ business: { id: number } }[]>('/api/favorites').catch(() => [])
        : Promise.resolve([] as { business: { id: number } }[]);
      const [branchData, catData, favData] = await Promise.all([
        apiFetch<ExploreBranch[]>(searchUrl, { skipAuth: true }),
        apiFetch<Category[]>('/api/discover/categories', { skipAuth: true }),
        favPromise,
      ]);
      const rated = withExploreMeta(branchData);
      setBranches(rated);
      setCategories(catData);
      setFavorites(favData.map((f) => f.business?.id).filter((id): id is number => id != null));
      setIsSearchActive(isSearching || queryVal !== '');
      setSelectedId(null);
      setHoveredId(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to load explore data.');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, serviceMode, listingMode, verifiedOnly, geoAreaId]);

  /**
   * Ask the browser for a fresh position (never a cached one). Tries high accuracy first,
   * then falls back to a quicker network fix. `silent` skips the error notice (used on page load).
   */
  const locateMe = useCallback((query: string, radius = radiusKm, silent = false) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      if (!silent) setLocNotice('This browser cannot share your location. Showing all providers instead.');
      loadSearch(query, query !== '');
      return;
    }
    if (!window.isSecureContext) {
      if (!silent) setLocNotice('Location only works over https. Showing all providers instead.');
      loadSearch(query, query !== '');
      return;
    }

    setLocating(true);
    setLocNotice(null);

    const onSuccess = (pos: GeolocationPosition) => {
      setLocating(false);
      const next = { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy };
      setCoords(next);
      loadNearby(next.lat, next.lon, query, radius);
    };

    const onFail = (err: GeolocationPositionError) => {
      setLocating(false);
      if (!silent) {
        setLocNotice(
          err.code === err.PERMISSION_DENIED
            ? 'Location is blocked. Allow it from the icon at the left of the address bar (and in Windows Settings › Privacy › Location), then try again.'
            : err.code === err.TIMEOUT
              ? 'Finding your location took too long. Check your connection and try again.'
              : 'Your device could not work out where you are. Turn on location services and try again.'
        );
      }
      if (coords) {
        loadNearby(coords.lat, coords.lon, query, radius);
      } else {
        loadSearch(query, query !== '');
      }
    };

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          onFail(err);
          return;
        }
        // High accuracy failed or timed out (common on desktops without GPS): retry with a network fix.
        navigator.geolocation.getCurrentPosition(onSuccess, onFail, {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 120000,
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [coords, loadNearby, loadSearch, radiusKm]);

  const triggerSearchOrNearby = useCallback((query: string, radius = radiusKm) => {
    if (coords) {
      loadNearby(coords.lat, coords.lon, query, radius);
      return;
    }
    loadSearch(query, query !== '');
  }, [coords, loadNearby, loadSearch, radiusKm]);

  useEffect(() => {
    apiFetch<{ id: number; name: string; city?: string }[]>('/api/public/geo/areas', { skipAuth: true })
      .then(setGeoAreas)
      .catch(() => setGeoAreas([]));
  }, []);

  useEffect(() => {
    if (!bootstrapped.current) return;
    triggerSearchOrNearby(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceMode, listingMode, verifiedOnly, geoAreaId]);

  useEffect(() => {
    if (authLoading || bootstrapped.current) return;
    bootstrapped.current = true;

    let q = '';
    let latParam: number | null = null;
    let lonParam: number | null = null;
    try {
      const params = new URLSearchParams(window.location.search);
      q = params.get('q') || '';
      const lat = params.get('lat');
      const lon = params.get('lon');
      if (lat && lon) {
        const latN = Number(lat);
        const lonN = Number(lon);
        if (Number.isFinite(latN) && Number.isFinite(lonN)) {
          latParam = latN;
          lonParam = lonN;
        }
      }
      if (!q) {
        const raw = sessionStorage.getItem('duemet_explore_q');
        if (raw) {
          sessionStorage.removeItem('duemet_explore_q');
          const parsed = JSON.parse(raw);
          q = typeof parsed === 'string' ? parsed : parsed?.q || '';
        }
      }
      if (latParam == null) {
        const rawCoords = sessionStorage.getItem('duemet_explore_coords');
        if (rawCoords) {
          sessionStorage.removeItem('duemet_explore_coords');
          const parsed = JSON.parse(rawCoords) as { lat?: number; lon?: number };
          if (typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
            latParam = parsed.lat;
            lonParam = parsed.lon;
          }
        }
      }
    } catch {
      q = '';
    }

    if (latParam != null && lonParam != null) {
      setCoords({ lat: latParam, lon: lonParam });
      setLocationLabel('Near you');
    }

    if (q) {
      setSearchQuery(q);
      setActiveCategory(q);
      if (latParam != null && lonParam != null) {
        loadNearby(latParam, lonParam, q, radiusKm);
      } else {
        triggerSearchOrNearby(q);
      }
      return;
    }

    if (latParam != null && lonParam != null) {
      loadNearby(latParam, lonParam, '', radiusKm);
      return;
    }

    if (isAuthenticated) {
      locateMe('', radiusKm, true);
      return;
    }

    // Guests see every listing straight away; "Use my location" narrows it to nearby.
    loadSearch('', false);
  }, [authLoading, isAuthenticated, loadNearby, loadSearch, locateMe, radiusKm, triggerSearchOrNearby]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('duemet_explore_split_pct');
      if (!stored) return;
      const n = Number(stored);
      if (Number.isFinite(n) && n >= 32 && n <= 72) {
        listPctRef.current = n;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO derive this instead of syncing it into state (one extra render, not a bug)
        setListPct(n);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const onSplitPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    draggingSplit.current = true;
    setSplitting(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onSplitPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!draggingSplit.current || !splitRef.current) return;
    const rect = splitRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const next = Math.min(72, Math.max(32, ((e.clientX - rect.left) / rect.width) * 100));
    listPctRef.current = next;
    setListPct(next);
  };

  const onSplitPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    draggingSplit.current = false;
    setSplitting(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    try {
      sessionStorage.setItem('duemet_explore_split_pct', String(listPctRef.current));
    } catch {
      /* ignore */
    }
  };

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
    setSelectedId(null);
    setHoveredId(null);
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
          icon: getCategoryIcon(b.business?.primaryCategory?.name || ''),
          badge: b.averageRating && b.averageRating > 0 ? b.averageRating.toFixed(1) : undefined,
        })),
    [sortedBranches]
  );

  const previewId = hoveredId ?? selectedId;
  const selected = sortedBranches.find((b) => b.id === previewId) || null;

  if (authLoading) {
    return (
      <div className={styles.dashExplore} style={{ placeItems: 'center' }}>
        <Skeleton variant="card" height={220} />
      </div>
    );
  }

  const renderCard = (b: ExploreBranch) => {
    if (!b.business) return null;
    const isFav = favorites.includes(b.business.id);
    const cover = coverFor(b);
    const cat = b.business.primaryCategory?.name || 'Service';
    const href = branchProfileHref(b);
    const active = previewId === b.id;
    const rating = typeof b.averageRating === 'number' && b.averageRating > 0 ? b.averageRating : null;
    return (
      <article
        key={b.id}
        className={`${styles.resultCard} ${active ? styles.resultCardOn : ''}`}
        onMouseEnter={() => setHoveredId(b.id)}
        onMouseLeave={() => setHoveredId((current) => (current === b.id ? null : current))}
      >
        <Link href={href} className={styles.resultThumb} tabIndex={-1} aria-hidden>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" loading="lazy" />
          ) : (
            <div className={styles.coverFallback}>{b.business.name.slice(0, 1)}</div>
          )}
        </Link>
        <div className={styles.resultBody}>
          <div className={styles.resultTop}>
            <span className={styles.catPill}>
              <i className={getCategoryIcon(cat)} aria-hidden /> {cat}
            </span>
            <button
              type="button"
              className={`${styles.heartBtn} ${isFav ? styles.isFav : ''}`}
              aria-label={isFav ? 'Remove from favorites' : 'Save to favorites'}
              onClick={(e) => handleToggleFavorite(e, b.business.id)}
            >
              <i className={`fa-${isFav ? 'solid' : 'regular'} fa-heart`} />
            </button>
          </div>
          <Link href={href} className={styles.resultName}>
            {b.business.name}
            {b.business.verified ? (
              <i className={`fa-solid fa-circle-check ${styles.verifiedTick}`} title="Verified business" aria-label="Verified" />
            ) : null}
          </Link>
          <p className={styles.resultAddr}>
            <i className="fa-solid fa-location-dot" aria-hidden />
            {[b.address || b.name, typeof b.distanceKm === 'number' ? `${b.distanceKm.toFixed(1)} km` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <div className={styles.resultMeta}>
            <span className={styles.ratingLine}>
              {rating ? (
                <>
                  <i className="fa-solid fa-star" aria-hidden /> <strong>{rating.toFixed(1)}</strong>
                  {b.business.isOnline ? <em className={styles.onlineDot}>Online now</em> : null}
                </>
              ) : (
                <em>New on Duemet</em>
              )}
            </span>
            <Link href={href} className={styles.bookLink}>
              View &amp; book
            </Link>
          </div>
        </div>
      </article>
    );
  };

  const firstName = user?.firstName;
  const heading = isSearchActive && searchQuery.trim()
    ? `Results for “${searchQuery.trim()}”`
    : isAuthenticated && firstName
      ? `Hi ${firstName}, what are you booking?`
      : 'Book local services near you';
  const moreFiltersOn = Boolean(serviceMode || listingMode || geoAreaId);

  return (
    <div
      ref={splitRef}
      className={`${styles.dashExplore} ${isAuthenticated ? '' : styles.dashExploreGuest} ${splitting ? styles.dashExploreSplitting : ''}`}
      style={{ ['--find-pane-width' as string]: `${listPct}%` }}
    >
      <section className={styles.findPane}>
        <header className={styles.findHead}>
          <div>
            <h1>{heading}</h1>
            <p>
              {loading
                ? 'Loading providers…'
                : `${sortedBranches.length} ${sortedBranches.length === 1 ? 'provider' : 'providers'} ${coords ? 'near you' : 'on Duemet'}`}
            </p>
          </div>
          <button
            type="button"
            className={styles.locChip}
            onClick={() => locateMe(searchQuery)}
            disabled={locating}
            aria-busy={locating}
          >
            <i className={`fa-solid ${locating ? 'fa-spinner fa-spin' : 'fa-location-crosshairs'}`} aria-hidden />
            {locating ? 'Finding you…' : coords ? locationLabel : 'Use my location'}
          </button>
        </header>

        {locNotice && (
          <div className={styles.locNotice} role="status">
            <i className="fa-solid fa-location-dot" aria-hidden />
            <span>{locNotice}</span>
            <button type="button" onClick={() => setLocNotice(null)} aria-label="Dismiss">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        )}

        <form onSubmit={handleSearchSubmit} className={styles.findSearch}>
          <i className="fa-solid fa-magnifying-glass" aria-hidden />
          <input
            type="text"
            placeholder="Search a service, business or category"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search businesses and services"
          />
          {searchQuery && (
            <button type="button" className={styles.micBtn} onClick={handleClearSearch} aria-label="Clear search">
              <i className="fa-solid fa-xmark" />
            </button>
          )}
          <button type="button" className={styles.micBtn} onClick={startVoice} aria-label="Search by voice">
            <i className="fa-solid fa-microphone" />
          </button>
          <button type="submit" className={styles.searchGo}>
            Search
          </button>
        </form>

        {categories.length > 0 && (
          <div className={styles.chipScroller} role="list" aria-label="Categories">
            <button
              type="button"
              role="listitem"
              className={`${styles.categoryChip} ${!activeCategory ? styles.categoryChipActive : ''}`}
              onClick={handleClearSearch}
            >
              <i className="fa-solid fa-border-all" /> All
            </button>
            {categories.map((cat) => (
              <button
                type="button"
                role="listitem"
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

        <div className={styles.filterRow}>
          <label className={styles.filterPill}>
            <span>Distance</span>
            <CustomSelect
              variant="compact"
              searchable={false}
              value={String(radiusKm)}
              onChange={(value) => {
                const next = Number(value);
                setRadiusKm(next);
                triggerSearchOrNearby(searchQuery, next);
              }}
              options={DISTANCES.map((d) => ({ value: String(d), label: `${d} km` }))}
              placeholder="Distance"
            />
          </label>
          <label className={styles.filterPill}>
            <span>Sort</span>
            <CustomSelect
              variant="compact"
              searchable={false}
              value={sortBy}
              onChange={(value) => setSortBy(value as 'recommended' | 'rating')}
              options={[
                { value: 'recommended', label: 'Recommended' },
                { value: 'rating', label: 'Top rated' },
              ]}
              placeholder="Sort by"
            />
          </label>
          <button
            type="button"
            className={`${styles.filterMain} ${verifiedOnly ? styles.filterMainOn : ''}`}
            onClick={() => setVerifiedOnly((v) => !v)}
            aria-pressed={verifiedOnly}
          >
            <i className="fa-solid fa-circle-check" /> Verified
          </button>
          <button
            type="button"
            className={`${styles.filterMain} ${filtersOpen || moreFiltersOn ? styles.filterMainOn : ''}`}
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            <i className="fa-solid fa-sliders" /> More filters
          </button>
        </div>

        {filtersOpen && (
          <div className={styles.moreFilters}>
            <label className={styles.filterPill}>
              <span>Where</span>
              <CustomSelect
                variant="compact"
                searchable={false}
                value={serviceMode}
                onChange={(value) => setServiceMode(value)}
                options={[
                  { value: '', label: 'Any place' },
                  { value: 'AT_PROVIDER', label: 'At the provider' },
                  { value: 'CUSTOMER_LOCATION', label: 'At my location' },
                  { value: 'HYBRID', label: 'Either' },
                ]}
                placeholder="Service mode"
              />
            </label>
            <label className={styles.filterPill}>
              <span>Provider</span>
              <CustomSelect
                variant="compact"
                searchable={false}
                value={listingMode}
                onChange={(value) => setListingMode(value)}
                options={[
                  { value: '', label: 'All providers' },
                  { value: 'BUSINESS', label: 'Businesses' },
                  { value: 'INDIVIDUAL', label: 'Independents' },
                ]}
                placeholder="Provider type"
              />
            </label>
            {geoAreas.length > 0 && (
              <label className={styles.filterPill}>
                <span>Area</span>
                <CustomSelect
                  variant="compact"
                  searchable
                  value={geoAreaId}
                  onChange={(value) => setGeoAreaId(value)}
                  options={[
                    { value: '', label: 'Any area' },
                    ...geoAreas.map((area) => ({
                      value: String(area.id),
                      label: area.city ? `${area.name} (${area.city})` : area.name,
                    })),
                  ]}
                  placeholder="Area"
                />
              </label>
            )}
          </div>
        )}

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

        <div className={styles.resultList} onMouseLeave={() => setHoveredId(null)}>
          {loading ? (
            [1, 2, 3, 4].map((n) => (
              <div key={n} className={styles.resultCard}>
                <Skeleton variant="card" height={112} />
              </div>
            ))
          ) : sortedBranches.length === 0 ? (
            <EmptyState
              icon="fa-store-slash"
              title="No providers match yet"
              description="Try another word, a different category or a wider distance."
              actionLabel="Show all providers"
              onAction={handleClearSearch}
            />
          ) : (
            sortedBranches.map(renderCard)
          )}
        </div>
      </section>

      <button
        type="button"
        className={`${styles.splitHandle} ${splitting ? styles.splitDragging : ''}`}
        aria-label="Resize list and map"
        title="Drag to resize"
        onPointerDown={onSplitPointerDown}
        onPointerMove={onSplitPointerMove}
        onPointerUp={onSplitPointerUp}
        onPointerCancel={onSplitPointerUp}
      />

      <section className={styles.mapPane} aria-label="Map of providers">
        <LocationMap
          markers={mapMarkers}
          userLocation={coords ? { lat: coords.lat, lng: coords.lon, accuracy: coords.accuracy } : null}
          height="100%"
          selectedId={previewId}
          onMarkerClick={(id) => setSelectedId(Number(id))}
          showControls
          locating={locating}
          onLocate={() => locateMe(searchQuery)}
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
              <Link href={branchProfileHref(selected)}>{selected.business.name}</Link>
              <p>{selected.address || selected.name}</p>
              <span>
                {typeof selected.averageRating === 'number' && selected.averageRating > 0
                  ? `★ ${selected.averageRating.toFixed(1)} · `
                  : ''}
                {selected.business.primaryCategory?.name || 'Service'}
              </span>
            </div>
            <Link href={branchProfileHref(selected)} className={styles.mapCardBook}>
              View &amp; book
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
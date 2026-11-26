'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import LandingNav from './LandingNav';
import LandingHero from './LandingHero';
import LandingCategories from './LandingCategories';
import LandingHowItWorks from './LandingHowItWorks';
import LandingMarketplace from './LandingMarketplace';
import LandingProviders from './LandingProviders';
import LandingFaq from './LandingFaq';
import LandingFinalCta from './LandingFinalCta';
import LandingFooter from './LandingFooter';
import { useMarketplace } from './useMarketplace';
import LandingFeatures from './LandingFeatures';
import { categoryPhoto } from './utils';
import styles from './landing.module.css';

export default function LandingPage() {
  const router = useRouter();
  const { liveListings, featuredListings, categories, loading } = useMarketplace();
  const [service, setService] = useState('');
  const [location, setLocation] = useState('');
  const [locating, setLocating] = useState(false);

  const rated = liveListings.filter((l) => l.rating > 0);
  const stats = {
    providers: liveListings.length,
    categories: categories.length,
    rating: rated.length ? rated.reduce((s, l) => s + l.rating, 0) / rated.length : 0,
    cities: new Set(liveListings.map((l) => l.location.split(',').pop()?.trim()).filter(Boolean)).size,
    avatars: liveListings.map((l) => l.imageUrl || categoryPhoto(l.category)).slice(0, 4),
  };

  const persistSearch = (query: string, geo?: { lat: number; lon: number }) => {
    try {
      sessionStorage.setItem(
        'duemet_explore_q',
        JSON.stringify({ q: query.trim(), location: location.trim() })
      );
      if (geo) {
        sessionStorage.setItem('duemet_explore_coords', JSON.stringify(geo));
      }
    } catch {
      /* ignore */
    }
  };

  const goSearch = (query = service, geo?: { lat: number; lon: number }) => {
    persistSearch(query, geo);
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (geo) {
      params.set('lat', String(geo.lat));
      params.set('lon', String(geo.lon));
    }
    const qs = params.toString();
    router.push(qs ? `/profile/explore?${qs}` : '/profile/explore');
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    goSearch(service);
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      setLocation('Near you');
      goSearch(service);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const geo = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setLocation('Near you');
        setLocating(false);
        goSearch(service, geo);
      },
      () => {
        setLocation('Near you');
        setLocating(false);
        goSearch(service);
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className={styles.page}>
      <LandingNav />
      <LandingHero
        service={service}
        location={location}
        locating={locating}
        onServiceChange={setService}
        onLocationChange={setLocation}
        onSearch={handleSearch}
        onLocate={locateMe}
        onQuickSearch={(term) => {
          setService(term);
          goSearch(term);
        }}
        stats={loading ? undefined : stats}
      />
      <LandingCategories
        categories={categories}
        loading={loading}
        onSelect={(name) => {
          setService(name);
          goSearch(name);
        }}
      />
      <LandingHowItWorks />
      <LandingFeatures />
      <LandingMarketplace listings={featuredListings} total={liveListings.length} loading={loading} />
      <LandingProviders />
      <LandingFaq />
      <LandingFinalCta />
      <LandingFooter />
    </div>
  );
}

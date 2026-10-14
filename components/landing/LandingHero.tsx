'use client';

import { type FormEvent } from 'react';
import Image from 'next/image';
import styles from './landing.module.css';

type Props = {
  service: string;
  location: string;
  locating: boolean;
  onServiceChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onSearch: (e: FormEvent) => void;
  onLocate: () => void;
};

export default function LandingHero({
  service,
  location,
  locating,
  onServiceChange,
  onLocationChange,
  onSearch,
  onLocate,
}: Props) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroMedia} aria-hidden>
        <Image
          src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=2400&q=85"
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.heroImg}
        />
        <div className={styles.heroFallback} />
        <div className={styles.heroShade} />
      </div>

      <div className={styles.heroContent}>
        <p className={styles.brandHero}>HourSlot</p>
        <h1 className={styles.heroTitle}>Book the hour that fits.</h1>
        <p className={styles.heroSub}>
          Live openings for salons, clinics, and independents — claimed in seconds.
        </p>

        <form className={styles.search} onSubmit={onSearch}>
          <label className={styles.searchField}>
            <i className="fa-solid fa-magnifying-glass" aria-hidden />
            <input
              type="text"
              placeholder="Service or business"
              value={service}
              onChange={(e) => onServiceChange(e.target.value)}
              aria-label="Service or business"
            />
          </label>
          <span className={styles.searchDivider} aria-hidden />
          <label className={styles.searchField}>
            <i className="fa-solid fa-location-dot" aria-hidden />
            <input
              type="text"
              placeholder="Where"
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              aria-label="Location"
            />
            <button
              type="button"
              className={styles.gpsBtn}
              onClick={onLocate}
              aria-label="Use my location"
              title="Use my location"
            >
              <i className={`fa-solid ${locating ? 'fa-circle-notch fa-spin' : 'fa-location-crosshairs'}`} />
            </button>
          </label>
          <button type="submit" className={styles.searchBtn}>
            Search
          </button>
        </form>
      </div>

      <div className={styles.heroFade} aria-hidden />
    </section>
  );
}

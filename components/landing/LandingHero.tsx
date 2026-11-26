'use client';

import { type FormEvent } from 'react';
import styles from './landing.module.css';
import { HeroMockup } from './ProductMockups';

const POPULAR = ['Haircut', 'Massage', 'Dentist', 'Nails', 'Home cleaning'];

type Props = {
  service: string;
  location: string;
  locating: boolean;
  onServiceChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onSearch: (e: FormEvent) => void;
  onLocate: () => void;
  onQuickSearch: (value: string) => void;
  stats?: { providers: number; categories: number; rating: number; cities: number; avatars: string[] };
};

export default function LandingHero({
  service,
  location,
  locating,
  onServiceChange,
  onLocationChange,
  onSearch,
  onLocate,
  onQuickSearch,
  stats,
}: Props) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroGrid}>
        <div className={styles.heroContent}>
          <span className={styles.heroPill}>
            <b>Live</b> Open slots from local salons, clinics and pros
          </span>

          <h1 className={styles.heroTitle}>
            Book local services <span className={styles.heroAccent}>by the hour, in seconds.</span>
          </h1>
          <p className={styles.heroSub}>
            Find a verified salon, clinic or independent near you, see their real calendar, and claim
            an open slot. No calls, no waiting for a reply.
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
              <i className="fa-solid fa-magnifying-glass" aria-hidden />
              Search
            </button>
          </form>

          <div className={styles.heroChips}>
            <span>Popular:</span>
            {POPULAR.map((term) => (
              <button key={term} type="button" onClick={() => onQuickSearch(term)}>
                {term}
              </button>
            ))}
          </div>

          <ul className={styles.heroTrust}>
            <li><i className="fa-solid fa-bolt" aria-hidden /> Instant confirmation</li>
            <li><i className="fa-solid fa-shield-halved" aria-hidden /> Verified providers</li>
            <li><i className="fa-solid fa-calendar-xmark" aria-hidden /> Free to reschedule</li>
          </ul>
        </div>

        <div className={styles.heroVisual}>
          <HeroMockup />
        </div>
      </div>

      {stats && stats.providers > 0 && (
        <div className={styles.heroStats}>
          <div className={styles.heroProof}>
            <span className={styles.avatarStack} aria-hidden>
              {stats.avatars.slice(0, 4).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" />
              ))}
            </span>
            <span><b>{stats.providers} verified providers</b> taking bookings now</span>
          </div>
          <dl className={styles.heroStatList}>
            <div><dt>Categories</dt><dd>{stats.categories}</dd></div>
            <div><dt>Avg rating</dt><dd>{stats.rating ? <>{stats.rating.toFixed(1)} <i className="fa-solid fa-star" /></> : '—'}</dd></div>
            <div><dt>Cities</dt><dd>{stats.cities}</dd></div>
            <div><dt>Booking fee</dt><dd>PKR 0</dd></div>
          </dl>
        </div>
      )}
    </section>
  );
}

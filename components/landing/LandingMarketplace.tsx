'use client';

import Reveal from '@/components/Reveal';
import Link from 'next/link';
import type { LiveListing } from './types';
import { categoryPhoto, listingHref } from './utils';
import styles from './landing.module.css';

type Props = {
  listings: LiveListing[];
  total: number;
  loading: boolean;
};

export default function LandingMarketplace({ listings, total, loading }: Props) {
  return (
    <Reveal as="section" className={styles.band} id="marketplace">
      <div className={styles.wrap}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Featured</p>
            <h2 className={styles.displayTitle}>Top-rated providers on Duemet</h2>
            <p className={styles.sectionSub}>
              {!loading && total > 0
                ? `The highest-rated of ${total} approved listings.`
                : 'Approved businesses and independents you can book today.'}
            </p>
          </div>
          <Link href="/profile/explore" className={styles.textLink}>
            See all providers <i className="fa-solid fa-arrow-right" />
          </Link>
        </div>

        {loading ? (
          <div className={styles.marketGrid}>
            {[0, 1, 2, 3].map((n) => (
              <div key={n} className={`${styles.marketCard} ${styles.skeleton}`} aria-hidden />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className={styles.emptyMarket}>
            <h3>No approved listings yet</h3>
            <p>List your business or your own services and be the first people find here.</p>
            <div className={styles.inlineActions}>
              <Link href="/auth/register?role=business" className={styles.btnPrimary}>
                List your business
              </Link>
              <Link href="/auth/register?role=individual" className={styles.btnGhost}>
                Join as an individual
              </Link>
            </div>
          </div>
        ) : (
          <div className={styles.marketGrid}>
            {(listings.length > 4 ? listings.slice(0, Math.floor(listings.length / 4) * 4) : listings).map((item) => (
              <Link key={item.businessId} href={listingHref(item)} className={styles.marketCard}>
                <span className={styles.marketThumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl || categoryPhoto(item.category)} alt="" loading="lazy" />
                  {item.rating > 0 ? (
                    <span className={styles.marketRating}>
                      <i className="fa-solid fa-star" /> {item.rating.toFixed(1)}
                    </span>
                  ) : null}
                </span>
                <span className={styles.marketBody}>
                  <strong>
                    {item.name}
                    {item.verified ? (
                      <i className="fa-solid fa-circle-check" title="Verified" aria-label="Verified" />
                    ) : null}
                  </strong>
                  <span className={styles.marketCat}>{item.category}</span>
                  {item.location ? (
                    <span className={styles.marketLoc}>
                      <i className="fa-solid fa-location-dot" aria-hidden /> {item.location}
                    </span>
                  ) : null}
                  <span className={styles.marketFoot}>
                    <span>View open slots</span>
                    <i className="fa-solid fa-arrow-right" aria-hidden />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Reveal>
  );
}

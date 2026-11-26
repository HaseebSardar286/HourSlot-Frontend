'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LandingCategory } from './types';
import { categoryPhoto } from './utils';
import styles from './landing.module.css';

type Props = {
  categories: LandingCategory[];
  loading: boolean;
  onSelect: (name: string) => void;
};

const SPEED = 36; // px per second while auto-scrolling
const RESUME_AFTER = 2500; // ms after the visitor stops interacting

/**
 * Categories: an auto-scrolling row (the default) that visitors can also scroll themselves with the arrows,
 * by dragging, or with a trackpad. Hovering a category opens a detail panel over the middle of the section.
 */
export default function LandingCategories({ categories, loading, onSelect }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const pausedUntil = useRef(0);
  const hovering = useRef(false);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const lastTouch = useRef(false);
  const [active, setActive] = useState<LandingCategory | null>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const showTimer = useRef<number | undefined>(undefined);

  // Two copies of the list so the row can loop without a jump.
  const loop = categories.length ? [...categories, ...categories] : [];

  const pause = (ms = RESUME_AFTER) => {
    pausedUntil.current = Date.now() + ms;
  };

  // Keep the scroll position inside the first copy so the loop is seamless in both directions.
  const wrap = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const half = el.scrollWidth / 2;
    if (half <= 0) return;
    if (el.scrollLeft >= half) el.scrollLeft -= half;
    else if (el.scrollLeft <= 0) el.scrollLeft += half;
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el || loading || categories.length === 0) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollLeft = 1;
    let raf = 0;
    let last = performance.now();
    let carry = 0;
    const step = (t: number) => {
      const dt = Math.min(64, t - last);
      last = t;
      if (!reduce && !hovering.current && !drag.current && Date.now() > pausedUntil.current && !document.hidden) {
        carry += (SPEED * dt) / 1000;
        const px = Math.floor(carry);
        if (px > 0) {
          el.scrollLeft += px;
          carry -= px;
          wrap();
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [loading, categories.length, wrap]);

  const nudge = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    pause(4000);
    const tile = el.querySelector<HTMLElement>('[data-tile]');
    const by = ((tile?.offsetWidth || 240) + 16) * 2;
    el.scrollBy({ left: dir * by, behavior: 'smooth' });
    window.setTimeout(wrap, 450);
  };

  // Hover details: open after a short pause, switch instantly between tiles, close when the pointer leaves.
  const openFor = (cat: LandingCategory) => {
    // Wide screens with a mouse only; on touch a tap goes straight to the category.
    if (lastTouch.current || !window.matchMedia('(min-width: 960px)').matches) return;
    window.clearTimeout(hideTimer.current);
    window.clearTimeout(showTimer.current);
    if (active) setActive(cat);
    else showTimer.current = window.setTimeout(() => setActive(cat), 140);
  };
  const closeSoon = () => {
    window.clearTimeout(showTimer.current);
    hideTimer.current = window.setTimeout(() => setActive(null), 180);
  };
  const keepOpen = () => window.clearTimeout(hideTimer.current);

  if (!loading && categories.length === 0) return null;

  return (
    <section className={styles.catSection} id="categories" onMouseLeave={closeSoon}>
      <div className={styles.wrap}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Categories</p>
            <h2 className={styles.displayTitle}>Every kind of appointment</h2>
            <p className={styles.sectionSub}>
              Hair, health, wellness, fitness and home services, booked from one place. Hover a category for details.
            </p>
          </div>
          <div className={styles.catControls}>
            <button type="button" className={styles.catArrow} onClick={() => nudge(-1)} aria-label="Scroll categories left">
              <i className="fa-solid fa-chevron-left" />
            </button>
            <button type="button" className={styles.catArrow} onClick={() => nudge(1)} aria-label="Scroll categories right">
              <i className="fa-solid fa-chevron-right" />
            </button>
            <Link href="/profile/explore" className={styles.textLink}>
              Browse all <i className="fa-solid fa-arrow-right" />
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.catStage}>
        {loading ? (
          <div className={styles.catScroller}>
            <div className={styles.catRow}>
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <div key={n} className={`${styles.catTile} ${styles.skeleton}`} aria-hidden />
              ))}
            </div>
          </div>
        ) : (
          <div
            ref={scroller}
            className={styles.catScroller}
            onMouseEnter={() => { hovering.current = true; }}
            onMouseLeave={() => { hovering.current = false; }}
            onScroll={wrap}
            onWheel={() => pause()}
            onTouchStart={() => { lastTouch.current = true; pause(5000); }}
            onPointerDown={(e) => {
              lastTouch.current = e.pointerType !== 'mouse';
              if (e.pointerType !== 'mouse') return;
              drag.current = { x: e.clientX, left: scroller.current?.scrollLeft || 0, moved: false };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d || !scroller.current) return;
              const dx = e.clientX - d.x;
              if (Math.abs(dx) > 4) d.moved = true;
              scroller.current.scrollLeft = d.left - dx;
            }}
            onPointerUp={() => { if (drag.current) pause(); window.setTimeout(() => { drag.current = null; }, 0); }}
            onPointerLeave={() => { drag.current = null; }}
            aria-label="Categories"
          >
            <div className={styles.catRow}>
              {loop.map((cat, i) => {
                const copy = i >= categories.length;
                return (
                  <button
                    key={`${cat.id}-${i}`}
                    data-tile
                    type="button"
                    className={`${styles.catTile} ${active?.id === cat.id ? styles.catTileOn : ''}`}
                    onClick={(e) => {
                      if (drag.current?.moved) { e.preventDefault(); return; }
                      onSelect(cat.name);
                    }}
                    onMouseEnter={() => openFor(cat)}
                    onFocus={() => pause(6000)}
                    tabIndex={copy ? -1 : undefined}
                    aria-hidden={copy || undefined}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cat.imageUrl || categoryPhoto(cat.name)} alt="" className={styles.catImg} loading="lazy" draggable={false} />
                    <span className={styles.catShade} aria-hidden />
                    <span className={styles.catMeta}>
                      <span className={styles.catIcon} aria-hidden><i className={cat.icon} /></span>
                      <strong>{cat.name}</strong>
                      <em>
                        {cat.listingCount > 0
                          ? `${cat.listingCount} provider${cat.listingCount === 1 ? '' : 's'}`
                          : 'Browse providers'}
                      </em>
                    </span>
                    <span className={styles.catGoBtn} aria-hidden><i className="fa-solid fa-arrow-right" /></span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {active && (
          <div className={styles.catPanel} onMouseEnter={keepOpen} onMouseLeave={closeSoon} role="dialog" aria-label={`${active.name} details`}>
            <div className={styles.catPanelHero}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={active.id} src={active.imageUrl || categoryPhoto(active.name)} alt="" />
              <div className={styles.catPanelTitle}>
                <span className={styles.catIcon} aria-hidden><i className={active.icon} /></span>
                <div>
                  <strong>{active.name}</strong>
                  <span>{active.subcategories.length ? active.subcategories.slice(0, 3).join(' · ') : 'Book trusted local providers'}</span>
                </div>
              </div>
            </div>

            <div className={styles.catPanelBody} key={`b-${active.id}`}>
              <div className={styles.catStats}>
                <div><b>{active.listingCount}</b><span>Providers</span></div>
                <div><b>{active.avgRating ? active.avgRating.toFixed(1) : '—'}</b><span>Avg rating</span></div>
                <div><b>{active.subcategories.length}</b><span>Specialties</span></div>
              </div>

              {active.subcategories.length > 0 && (
                <div className={styles.catChips}>
                  {active.subcategories.slice(0, 8).map((s) => (
                    <button key={s} type="button" onClick={() => onSelect(s)}>{s}</button>
                  ))}
                </div>
              )}

              <div className={styles.catTop}>
                <span className={styles.catTopLabel}>Top providers</span>
                {active.providers.length === 0 ? (
                  <p className={styles.catTopEmpty}>New providers are joining this category. Be the first to book.</p>
                ) : active.providers.map((p) => (
                  <Link key={p.id} href={p.slug ? `/b/${p.slug}` : '/profile/explore'} className={styles.catTopRow}>
                    {p.imageUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={p.imageUrl} alt="" />
                      : <span className={styles.catTopInitial}>{p.name.charAt(0)}</span>}
                    <span className={styles.catTopName}><strong>{p.name}</strong><em>{p.location}</em></span>
                    <span className={styles.catTopRating}>
                      {p.rating > 0 ? <><i className="fa-solid fa-star" /> {p.rating.toFixed(1)}</> : 'New'}
                    </span>
                  </Link>
                ))}
              </div>

              <div className={styles.catPanelActions}>
                <button type="button" className={styles.catPrimary} onClick={() => onSelect(active.name)}>
                  Browse {active.name} <i className="fa-solid fa-arrow-right" />
                </button>
                <Link href="/profile/explore" className={styles.catSecondary}>Book now</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

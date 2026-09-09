'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import styles from './landing.module.css';

const POPULAR = ['Hair Salons', 'Dental Clinics', 'Yoga Studios', 'Spa & Wellness'];

/** Product capabilities — not fabricated usage metrics */
const CAPABILITIES = [
  { value: 'Live', label: 'Real-time slot availability', color: 'teal' },
  { value: 'Safe', label: 'Conflict-safe booking', color: 'indigo' },
  { value: 'Flexible', label: 'Pay online or at venue', color: 'coral' },
  { value: 'Multi', label: 'Branches, staff & packages', color: 'violet' },
];

// const STACK = ['Stripe', 'Leaflet', 'OpenStreetMap', 'PostgreSQL', 'Redis'];
const TREND_COLORS = ['rose', 'sky', 'coral', 'violet'] as const;

interface DiscoverBranch {
  id: number;
  name: string;
  city?: string;
  business?: {
    id: number;
    name: string;
    rating?: number;
    verified?: boolean;
    primaryCategory?: { name?: string; slug?: string };
  };
}

interface LiveListing {
  businessId: number;
  name: string;
  category: string;
  rating: number;
  location: string;
  verified: boolean;
  color: (typeof TREND_COLORS)[number];
}

const CATEGORIES = [
  {
    name: 'Salons & Spas',
    meta: 'Cut, color, and calm — book the chair you want.',
    icon: 'fa-scissors',
    href: 'Hair Salons',
    accent: 'rose',
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Health Clinics',
    meta: 'Clinics and practices with real open slots.',
    icon: 'fa-briefcase-medical',
    href: 'Dental Clinics',
    accent: 'sky',
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Fitness Studios',
    meta: 'Yoga, pilates, and training hours that still have room.',
    icon: 'fa-dumbbell',
    href: 'Yoga Studios',
    accent: 'coral',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Beauty & Nails',
    meta: 'Lashes, nails, and glow-ups on your schedule.',
    icon: 'fa-spa',
    href: 'Beauty',
    accent: 'violet',
    image: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Auto & Repair',
    meta: 'Service bays and detailing with honest openings.',
    icon: 'fa-car',
    href: 'Auto',
    accent: 'indigo',
    image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Education & Tutoring',
    meta: 'Classes, coaching, and sessions that fit your week.',
    icon: 'fa-graduation-cap',
    href: 'Education',
    accent: 'amber',
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80',
  },
];

const FEATURES = [
  { icon: 'fa-calendar-check', title: 'Live availability', text: 'Real-time slots synced with staff calendars — no phantom bookings.', color: 'teal' },
  { icon: 'fa-bolt', title: 'Instant confirmation', text: 'Book in seconds with email and in-app confirmations.', color: 'coral' },
  { icon: 'fa-tags', title: 'Peak pricing', text: 'Transparent surge pricing shown before checkout.', color: 'amber' },
  { icon: 'fa-credit-card', title: 'Flexible payments', text: 'Pay online with Stripe or at the venue — your choice.', color: 'indigo' },
  { icon: 'fa-box-open', title: 'Packages & bundles', text: 'Multi-session packages with remaining balance tracking.', color: 'violet' },
  { icon: 'fa-star', title: 'Reviews & ratings', text: 'Social proof that helps customers choose with confidence.', color: 'rose' },
  { icon: 'fa-building', title: 'Multi-branch ops', text: 'Manage locations, staff, and services from one dashboard.', color: 'sky' },
  { icon: 'fa-shield-halved', title: 'Conflict-safe booking', text: 'Double-booking protection built into every reservation.', color: 'emerald' },
];

const EXAMPLE_STORIES = [
  { quote: 'Peak pricing and live calendars helped us fill quiet afternoons without extra admin.', name: 'Salon owner', role: 'Business use case', color: 'teal' },
  { quote: 'Customers browse services, pick a slot, and sign in only when they confirm — less friction.', name: 'Marketplace flow', role: 'Customer experience', color: 'indigo' },
  { quote: 'Staff invites, branch hours, and packages live in one dashboard instead of spreadsheets.', name: 'Operations', role: 'Owner workflow', color: 'coral' },
];

const INTEGRATIONS = [
  { icon: 'fa-credit-card', label: 'Stripe Checkout (optional)', color: 'indigo' },
  { icon: 'fa-map-location-dot', label: 'Leaflet + OpenStreetMap', color: 'sky' },
  { icon: 'fa-envelope', label: 'SMTP email when configured', color: 'coral' },
  { icon: 'fa-mobile-screen', label: 'Mobile-ready web app', color: 'violet' },
  { icon: 'fa-lock', label: 'JWT auth & role gates', color: 'emerald' },
  { icon: 'fa-bell', label: 'In-app notifications', color: 'amber' },
];

const FAQ = [
  { q: 'Is HourSlot free for customers?', a: 'Yes — browsing, booking, rescheduling, and reviews are free for customers. Businesses can list and start filling slots at no upfront cost.' },
  { q: 'How does peak pricing work?', a: 'Businesses set peak windows and multipliers. Customers see the adjusted price before confirming — no surprises at checkout.' },
  { q: 'Can I pay at the venue?', a: 'Absolutely. Many businesses offer pay-at-venue alongside online Stripe checkout.' },
  { q: 'Do you support multiple branches?', a: 'Yes. Owners manage branches, staff, services, and availability per location from one dashboard.' },
  { q: 'How do staff invites work?', a: 'Owners send email invites. Staff accept, set a password, and land in the business dashboard with the right permissions.' },
];

const COMPARE = [
  { feature: 'Live availability', hourslot: true, manual: false },
  { feature: 'Conflict-safe booking', hourslot: true, manual: false },
  { feature: 'Peak pricing', hourslot: true, manual: false },
  { feature: 'Online + venue pay', hourslot: true, manual: false },
  { feature: 'Packages & sessions', hourslot: true, manual: false },
  { feature: 'Customer reviews', hourslot: true, manual: false },
];

export default function LandingPage() {
  const router = useRouter();
  const [service, setService] = useState('');
  const [location, setLocation] = useState('');
  const [locating, setLocating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [newsletterNote, setNewsletterNote] = useState<string | null>(null);
  const [liveListings, setLiveListings] = useState<LiveListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setListingsLoading(true);
    apiFetch<DiscoverBranch[]>('/api/discover/search?q=', { skipAuth: true })
      .then((rows) => {
        if (cancelled) return;
        const seen = new Set<number>();
        const listings: LiveListing[] = [];
        for (const row of rows || []) {
          const businessId = row.business?.id;
          const name = row.business?.name;
          if (!businessId || !name || seen.has(businessId)) continue;
          seen.add(businessId);
          listings.push({
            businessId,
            name,
            category: row.business?.primaryCategory?.name || 'Service',
            rating: typeof row.business?.rating === 'number' ? row.business.rating : 0,
            location: row.city || row.name || 'Local',
            verified: Boolean(row.business?.verified),
            color: TREND_COLORS[listings.length % TREND_COLORS.length],
          });
          if (listings.length >= 4) break;
        }
        listings.sort((a, b) => b.rating - a.rating);
        setLiveListings(listings);
      })
      .catch(() => {
        if (!cancelled) setLiveListings([]);
      })
      .finally(() => {
        if (!cancelled) setListingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persistSearch = (query: string, geo?: { lat: number; lon: number }) => {
    try {
      sessionStorage.setItem(
        'hourslot_explore_q',
        JSON.stringify({ q: query.trim(), location: location.trim() })
      );
      if (geo) {
        sessionStorage.setItem('hourslot_explore_coords', JSON.stringify(geo));
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

  const handleNewsletter = (e: FormEvent) => {
    e.preventDefault();
    setNewsletterNote('Newsletter signup is not live yet — follow product updates via Explore and your account notifications.');
  };

  return (
    <div className={styles.page}>
      <header className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.brand}>
            <Image src="/logo-hourslot.png" alt="HourSlot" width={192} height={57} priority className={styles.logo} />
          </Link>
          <nav className={styles.navCenter} aria-label="Primary">
            <Link href="/profile/explore">Explore</Link>
            <a href="#features">Features</a>
            <a href="#businesses">For Businesses</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className={styles.navActions}>
            <Link href="/auth/login" className={styles.navLink}>Sign in</Link>
            <Link href="/auth/register" className={`btn btn-primary btn-sm ${styles.navCta}`}>Get started</Link>
            <button type="button" className={styles.menuBtn} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
              <i className={`fa-solid ${menuOpen ? 'fa-xmark' : 'fa-bars'}`} />
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className={styles.mobileMenu}>
            <Link href="/profile/explore" onClick={() => setMenuOpen(false)}>Explore</Link>
            <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#businesses" onClick={() => setMenuOpen(false)}>For Businesses</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
            <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
            <Link href="/auth/login" onClick={() => setMenuOpen(false)}>Sign in</Link>
            <Link href="/auth/register" className="btn btn-primary" onClick={() => setMenuOpen(false)}>Get started</Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroOrbs} aria-hidden>
          <span className={styles.orbTeal} />
          <span className={styles.orbIndigo} />
          <span className={styles.orbCoral} />
        </div>
        <div className={styles.floatCard} aria-hidden>
          <span className={styles.floatDot} />
          <div><strong>Fade Studio</strong><p>Today · 2:30 PM confirmed</p></div>
        </div>
        <div className={`${styles.floatCard} ${styles.floatCardAlt}`} aria-hidden>
          <i className="fa-solid fa-clock" />
          <div><strong>Next open slot</strong><p>45 min from now</p></div>
        </div>
        <div className={styles.heroContent}>
          <p className={styles.badge}><span aria-hidden>✦</span> The smart appointment marketplace</p>
          <h1 className={styles.heroTitle}>
            Turn empty hours into <em>booked ones.</em>
          </h1>
          <p className={styles.heroSub}>
            HourSlot is the product home — learn how it works for customers and businesses. When you&apos;re
            ready to browse live listings, head to Explore.
          </p>
          <form className={styles.search} onSubmit={handleSearch}>
            <label className={styles.searchField}>
              <i className="fa-solid fa-magnifying-glass" aria-hidden />
              <input type="text" placeholder="What are you looking for?" value={service} onChange={(e) => setService(e.target.value)} aria-label="Service or business" />
            </label>
            <span className={styles.searchDivider} aria-hidden />
            <label className={styles.searchField}>
              <i className="fa-solid fa-location-dot" aria-hidden />
              <input type="text" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} aria-label="Location" />
              <button type="button" className={styles.gpsBtn} onClick={locateMe} aria-label="Use my location" title="Use my location">
                <i className={`fa-solid ${locating ? 'fa-circle-notch fa-spin' : 'fa-location-crosshairs'}`} />
              </button>
            </label>
            <button type="submit" className={styles.searchBtn}>Search <i className="fa-solid fa-arrow-right" aria-hidden /></button>
          </form>
          <p className={styles.searchNote}>
            <i className="fa-solid fa-arrow-up-right-from-square" />
            Search opens the <strong>Explore marketplace</strong> — a separate app view with live businesses and maps.
          </p>
          <div className={styles.popular}>
            <span>Popular:</span>
            {POPULAR.map((tag, i) => (
              <button key={tag} type="button" className={styles[`popTag${i % 4}`]} onClick={() => { setService(tag); goSearch(tag); }}>{tag}</button>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className={styles.stats} aria-label="Platform capabilities">
        <div className={styles.statsInner}>
          {CAPABILITIES.map((s) => (
            <div key={s.label} className={`${styles.statCard} ${styles[`stat${s.color.charAt(0).toUpperCase()}${s.color.slice(1)}`]}`}>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Explore gateway */}
      <section className={styles.exploreGateway} aria-label="Open Explore">
        <div className={styles.exploreGatewayInner}>
          <div className={styles.exploreGatewayCopy}>
            <p className={styles.eyebrow}>Live marketplace</p>
            <h2 className={styles.displayTitle}>Ready to browse real businesses?</h2>
            <p>
              Explore is where customers search categories, view maps, compare services, and start booking.
              This landing page is about the product — Explore is where the directory lives.
            </p>
            <div className={styles.exploreGatewayActions}>
              <Link href="/profile/explore" className="btn btn-primary">
                Open Explore <i className="fa-solid fa-compass" />
              </Link>
              <Link href="/auth/register" className="btn btn-outline">Create free account</Link>
            </div>
          </div>
          <div className={styles.exploreGatewayMock} aria-hidden>
            <div className={styles.mockToolbar}>
              <span>Explore</span>
              <span className={styles.mockPill}>Directory</span>
            </div>
            <div className={styles.mockList}>
              <div className={styles.mockRow}><span /><strong>Salon</strong></div>
              <div className={styles.mockRow}><span /><strong>Clinic</strong></div>
              <div className={styles.mockRow}><span /><strong>Fitness</strong></div>
            </div>
            <div className={styles.mockMap}>Map + listings</div>
          </div>
        </div>
      </section>

      {/* Stack strip */}
      {/* <section className={styles.marquee} aria-label="Technology stack">
        <div className={styles.marqueeTrack}>
          {[...STACK, ...STACK].map((p, i) => (
            <span key={`${p}-${i}`} className={styles.marqueeItem}>{p}</span>
          ))}
        </div>
      </section> */}

      {/* Trust */}
      <section className={styles.trust} aria-label="Why HourSlot">
        <div className={styles.trustInner}>
          <p><i className="fa-solid fa-shield-halved" /> Conflict-safe booking</p>
          <p><i className="fa-solid fa-tag" /> Peak pricing, shown up front</p>
          <p><i className="fa-solid fa-credit-card" /> Pay online or at the venue</p>
          <p><i className="fa-solid fa-rotate" /> Reschedule in a few taps</p>
        </div>
      </section>

      {/* Categories */}
      <section className={styles.section} id="categories">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Quick start</p>
            <h2 className={styles.displayTitle}>Popular ways to enter Explore</h2>
            <p className={styles.sectionSub}>Photo cards for inspiration — each opens the live marketplace with that search.</p>
          </div>
          <Link href="/profile/explore" className={styles.textLink}>View all <i className="fa-solid fa-arrow-right" /></Link>
        </div>
        <div className={styles.catGrid}>
          {CATEGORIES.map((cat) => (
            <button key={cat.name} type="button" className={styles.catCard} onClick={() => { setService(cat.href); goSearch(cat.href); }}>
              <Image src={cat.image} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className={styles.catImg} />
              <span className={styles.catShade} />
              <span className={`${styles.catIcon} ${styles[`catAccent${cat.accent.charAt(0).toUpperCase()}${cat.accent.slice(1)}`]}`}>
                <i className={`fa-solid ${cat.icon}`} />
              </span>
              <span className={styles.catCopy}><strong>{cat.name}</strong><span>{cat.meta}</span></span>
            </button>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className={`${styles.section} ${styles.features}`} id="features">
        <div className={styles.sectionHeadCenter}>
          <p className={styles.eyebrow}>Platform</p>
          <h2 className={styles.displayTitle}>Everything you need to book &amp; run</h2>
          <p className={styles.sectionSub}>One colorful workspace for customers and business owners.</p>
        </div>
        <div className={styles.featureGrid}>
          {FEATURES.map((f) => (
            <article key={f.title} className={`${styles.featureCard} ${styles[`feat${f.color.charAt(0).toUpperCase()}${f.color.slice(1)}`]}`}>
              <span className={styles.featureIcon}><i className={`fa-solid ${f.icon}`} /></span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className={`${styles.section} ${styles.how}`} id="how">
        <h2 className={styles.displayTitle}>How HourSlot works</h2>
        <p className={styles.sectionSub}>One marketplace. Two sides. Zero spreadsheet chaos.</p>
        <div className={styles.howGrid}>
          <article className={styles.howCard}>
            <header>
              <span className={`${styles.howIcon} ${styles.howIconSky}`}><i className="fa-regular fa-user" /></span>
              <h3>For customers</h3>
            </header>
            <ol>
              <li><span>1</span><div><strong>Discover</strong><p>Search nearby businesses by category, location, and real ratings.</p></div></li>
              <li><span>2</span><div><strong>Book instantly</strong><p>Pick a service, preferred staff, and a slot that actually exists.</p></div></li>
              <li><span>3</span><div><strong>Manage</strong><p>Confirmations, reschedules, packages, and reviews in one place.</p></div></li>
            </ol>
            <Link href="/profile/explore" className="btn btn-cool">Book appointments</Link>
          </article>
          <article className={`${styles.howCard} ${styles.howCardDark}`} id="businesses">
            <header>
              <span className={styles.howIcon}><i className="fa-solid fa-store" /></span>
              <h3>For businesses</h3>
            </header>
            <ol>
              <li><span>1</span><div><strong>List your services</strong><p>Branches, staff, hours, gallery, and peak pricing — set once.</p></div></li>
              <li><span>2</span><div><strong>Fill empty slots</strong><p>Live availability with conflict-safe booking on a real calendar.</p></div></li>
              <li><span>3</span><div><strong>Grow revenue</strong><p>Packages, online pay, and a week that fills itself.</p></div></li>
            </ol>
            <Link href="/auth/register?role=business" className={styles.ghostBtn}>List your business</Link>
          </article>
        </div>
      </section>

      {/* Live listings from Discover */}
      <section className={styles.trending}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Live marketplace</p>
            <h2 className={styles.displayTitle}>Businesses on HourSlot</h2>
            <p className={styles.sectionSubTrend}>Pulled from Explore — approved listings customers can book.</p>
          </div>
          <Link href="/profile/explore" className={styles.textLink}>See all <i className="fa-solid fa-arrow-right" /></Link>
        </div>
        {listingsLoading ? (
          <div className={styles.trendGrid}>
            {[0, 1, 2, 3].map((n) => (
              <article key={n} className={`${styles.trendCard} ${styles.trendSky}`} aria-hidden>
                <div className={styles.trendTop}>
                  <span className={styles.trendAvatar}>…</span>
                  <div>
                    <strong>Loading…</strong>
                    <span>Marketplace</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : liveListings.length === 0 ? (
          <div className={styles.trendEmpty}>
            <p>No listings yet. Explore categories or list your business to get started.</p>
            <div className={styles.trendEmptyActions}>
              <Link href="/profile/explore" className="btn btn-primary btn-sm">Open Explore</Link>
              <Link href="/auth/register?role=business" className="btn btn-outline btn-sm">List your business</Link>
            </div>
          </div>
        ) : (
          <div className={styles.trendGrid}>
            {liveListings.map((t) => (
              <article key={t.businessId} className={`${styles.trendCard} ${styles[`trend${t.color.charAt(0).toUpperCase()}${t.color.slice(1)}`]}`}>
                <div className={styles.trendTop}>
                  <span className={styles.trendAvatar}>{t.name.charAt(0)}</span>
                  <div>
                    <strong>
                      {t.name}
                      {t.verified ? (
                        <>
                          {' '}
                          <i className="fa-solid fa-circle-check" title="Verified business" aria-label="Verified" />
                        </>
                      ) : null}
                    </strong>
                    <span>{t.category}</span>
                  </div>
                </div>
                <div className={styles.trendMeta}>
                  <span>
                    <i className="fa-solid fa-star" />{' '}
                    {t.rating > 0 ? t.rating.toFixed(1) : 'New'}
                  </span>
                  <span className={styles.trendSlots}>{t.location}</span>
                </div>
                <Link href={`/profile/business/${t.businessId}`} className={styles.trendBtn}>
                  View profile
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Calendar preview */}
      <section className={styles.preview}>
        <div className={styles.previewInner}>
          <div className={styles.previewCopy}>
            <p className={styles.eyebrow}>Live calendar</p>
            <h2 className={styles.displayTitle}>See the week fill itself.</h2>
            <p>Owners get a calm ops board: staff, services, and visits in one view. Customers see honest openings — including peak hours — before they commit.</p>
            <ul className={styles.previewList}>
              <li><i className="fa-solid fa-check" /> Multi-branch staff &amp; catalogs</li>
              <li><i className="fa-solid fa-check" /> Packages with remaining sessions</li>
              <li><i className="fa-solid fa-check" /> Stripe or pay-at-venue</li>
            </ul>
            <Link href="/auth/register?role=business" className="btn btn-warm">Start listing</Link>
          </div>
          <div className={styles.calMock} aria-hidden>
            <div className={styles.calHead}><span>This week</span><strong>Studio calendar</strong></div>
            <div className={styles.calDays}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d) => <span key={d}>{d}</span>)}</div>
            <div className={styles.calGrid}>
              <div className={styles.slotMuted}>9:00</div>
              <div className={styles.slotBooked}>Cut · Amina</div>
              <div className={styles.slotOpen}>Open</div>
              <div className={styles.slotMuted}>9:00</div>
              <div className={styles.slotPeak}>Peak</div>
              <div className={styles.slotOpen}>Open</div>
              <div className={styles.slotBooked}>Color</div>
              <div className={styles.slotMuted}>11:00</div>
              <div className={`${styles.slotBooked} ${styles.slotNow}`}>Now</div>
              <div className={styles.slotOpen}>Open</div>
              <div className={styles.slotBooked}>Consult</div>
              <div className={styles.slotMuted}>11:00</div>
              <div className={styles.slotOpen}>Open</div>
              <div className={styles.slotPeak}>Peak</div>
              <div className={styles.slotMuted}>2:00</div>
            </div>
          </div>
        </div>
      </section>

      {/* Example stories */}
      <section className={`${styles.section} ${styles.testimonials}`}>
        <div className={styles.sectionHeadCenter}>
          <p className={styles.eyebrow}>How teams use HourSlot</p>
          <h2 className={styles.displayTitle}>Example workflows</h2>
          <p className={styles.sectionSub}>Illustrative scenarios — not fabricated customer quotes.</p>
        </div>
        <div className={styles.testGrid}>
          {EXAMPLE_STORIES.map((t) => (
            <blockquote key={t.name} className={`${styles.testCard} ${styles[`test${t.color.charAt(0).toUpperCase()}${t.color.slice(1)}`]}`}>
              <i className={`fa-solid fa-quote-left ${styles.quoteIcon}`} />
              <p>{t.quote}</p>
              <footer><strong>{t.name}</strong><span>{t.role}</span></footer>
            </blockquote>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section className={styles.integrations}>
        <div className={styles.sectionHeadCenter}>
          <p className={styles.eyebrow}>Built for scale</p>
          <h2 className={styles.displayTitle}>Connected to the tools you trust</h2>
        </div>
        <div className={styles.intGrid}>
          {INTEGRATIONS.map((item) => (
            <div key={item.label} className={`${styles.intCard} ${styles[`int${item.color.charAt(0).toUpperCase()}${item.color.slice(1)}`]}`}>
              <i className={`fa-solid ${item.icon}`} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Role paths */}
      <section className={styles.roles}>
        <div className={styles.rolesInner}>
          <article className={styles.roleCard}>
            <span className={styles.roleIconSky}><i className="fa-solid fa-user" /></span>
            <h3>I&apos;m a customer</h3>
            <p>Find services, book instantly, manage appointments, and leave reviews.</p>
            <Link href="/auth/register?role=customer" className="btn btn-cool">Create free account</Link>
          </article>
          <article className={`${styles.roleCard} ${styles.roleCardWarm}`}>
            <span className={styles.roleIconWarm}><i className="fa-solid fa-store" /></span>
            <h3>I&apos;m a business</h3>
            <p>List services, manage staff, fill empty slots, and grow with packages.</p>
            <Link href="/auth/register?role=business" className="btn btn-warm">List your business</Link>
          </article>
        </div>
      </section>

      {/* Pricing */}
      <section className={`${styles.section} ${styles.pricing}`} id="pricing">
        <h2 className={styles.displayTitle}>Simple to start</h2>
        <p className={styles.sectionSub}>Customers book free. Businesses list free while we grow the marketplace.</p>
        <div className={styles.priceGrid}>
          <article className={styles.priceCard}>
            <p className={styles.priceKicker}>Customers</p>
            <h3>Free forever</h3>
            <p className={styles.priceAmt}>$0</p>
            <ul>
              <li>Nearby discovery &amp; favorites</li>
              <li>Instant booking &amp; reschedule</li>
              <li>Packages and reviews</li>
            </ul>
            <Link href="/auth/register?role=customer" className="btn btn-cool">Create a free account</Link>
          </article>
          <article className={`${styles.priceCard} ${styles.priceCardAccent}`}>
            <span className={styles.priceBadge}>Popular</span>
            <p className={styles.priceKicker}>Businesses</p>
            <h3>List &amp; fill slots</h3>
            <p className={styles.priceAmt}>$0<span> to start</span></p>
            <ul>
              <li>Branches, staff, and live calendar</li>
              <li>Peak pricing &amp; packages</li>
              <li>Online pay or pay at venue</li>
            </ul>
            <Link href="/auth/register?role=business" className="btn btn-warm">List your business</Link>
          </article>
        </div>
      </section>

      {/* Compare */}
      <section className={styles.compare}>
        <div className={styles.sectionHeadCenter}>
          <h2 className={styles.displayTitle}>HourSlot vs. manual booking</h2>
          <p className={styles.sectionSub}>See why teams switch from phone tags and spreadsheets.</p>
        </div>
        <div className={styles.compareTable}>
          <div className={styles.compareHead}>
            <span>Feature</span><span>HourSlot</span><span>Manual</span>
          </div>
          {COMPARE.map((row) => (
            <div key={row.feature} className={styles.compareRow}>
              <span>{row.feature}</span>
              <span><i className={`fa-solid ${row.hourslot ? 'fa-circle-check' : 'fa-circle-xmark'}`} /></span>
              <span><i className={`fa-solid ${row.manual ? 'fa-circle-check' : 'fa-circle-xmark'}`} /></span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className={`${styles.section} ${styles.faq}`} id="faq">
        <div className={styles.faqLayout}>
          <div>
            <p className={styles.eyebrow}>Support</p>
            <h2 className={styles.displayTitle}>Frequently asked questions</h2>
            <p className={styles.sectionSub}>Quick answers before you book or list.</p>
          </div>
          <div className={styles.faqList}>
            {FAQ.map((item, i) => (
              <div key={item.q} className={`${styles.faqItem} ${openFaq === i ? styles.faqOpen : ''}`}>
                <button type="button" className={styles.faqBtn} onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
                  {item.q}
                  <i className={`fa-solid ${openFaq === i ? 'fa-minus' : 'fa-plus'}`} />
                </button>
                {openFaq === i && <p className={styles.faqAnswer}>{item.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className={styles.security}>
        <div className={styles.securityInner}>
          <div className={styles.securityCopy}>
            <p className={styles.eyebrow}>Trust &amp; security</p>
            <h2 className={styles.displayTitle}>Built for peace of mind</h2>
            <p>Role-based access, secure authentication, and conflict-safe scheduling protect every booking.</p>
          </div>
          <div className={styles.securityBadges}>
            <div className={styles.secBadge}><i className="fa-solid fa-lock" /><span>Encrypted auth</span></div>
            <div className={styles.secBadge}><i className="fa-solid fa-user-shield" /><span>Role permissions</span></div>
            <div className={styles.secBadge}><i className="fa-solid fa-calendar-xmark" /><span>No double-booking</span></div>
            <div className={styles.secBadge}><i className="fa-solid fa-receipt" /><span>Audit trail</span></div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className={styles.newsletter}>
        <div className={styles.newsletterInner}>
          <div>
            <h2 className={styles.displayTitle}>Stay in the loop</h2>
            <p>Product updates will appear here when a mailing list is available.</p>
            {newsletterNote && (
              <p className={styles.newsletterNote} role="status">{newsletterNote}</p>
            )}
          </div>
          <form className={styles.newsletterForm} onSubmit={handleNewsletter}>
            <input type="email" placeholder="you@email.com" disabled aria-label="Email for newsletter (coming soon)" />
            <button type="submit" className="btn btn-violet" disabled>Coming soon</button>
          </form>
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <div className={styles.finalOrbs} aria-hidden><span /><span /><span /></div>
        <p className={styles.badge}>Ready when you are</p>
        <h2 className={styles.displayTitle}>Join HourSlot and turn empty hours into booked ones.</h2>
        <p>One calm workspace for discovery, booking, and the visit that follows.</p>
        <div className={styles.heroCtas}>
          <Link href="/auth/register" className="btn btn-warm">Get started free</Link>
          <Link href="/auth/login" className={styles.ghostBtn}>Sign in</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <Image src="/logo-hourslot.png" alt="HourSlot" width={156} height={47} className={styles.footerLogo} />
            <p>The smart marketplace for effortless scheduling — customers find the hour, businesses fill it.</p>
          </div>
          <div>
            <h4>Product</h4>
            <Link href="/profile/explore">Explore</Link>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div>
            <h4>Resources</h4>
            <Link href="/auth/register">Create account</Link>
            <Link href="/auth/login">Sign in</Link>
            <a href="#faq">FAQ</a>
          </div>
          <div>
            <h4>Connect</h4>
            <div className={styles.socials}>
              <a href="mailto:hello@hourslot.app" aria-label="Email"><i className="fa-solid fa-envelope" /></a>
              <Link href="/auth/register" aria-label="Join"><i className="fa-solid fa-globe" /></Link>
              <a href="#how" aria-label="Community"><i className="fa-solid fa-comments" /></a>
            </div>
          </div>
        </div>
        <p className={styles.copy}>© {new Date().getFullYear()} HourSlot Marketplace. All rights reserved.</p>
      </footer>
    </div>
  );
}

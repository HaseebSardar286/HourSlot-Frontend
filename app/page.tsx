'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './landing.module.css';

const POPULAR = ['Hair Salons', 'Dental Clinics', 'Yoga Studios'];

const CATEGORIES = [
  {
    name: 'Salons & Spas',
    meta: 'Cut, color, and calm — book the chair you actually want.',
    icon: 'fa-scissors',
    href: 'Hair Salons',
    image:
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Health Clinics',
    meta: 'Clinics and practices with real open slots.',
    icon: 'fa-briefcase-medical',
    href: 'Dental Clinics',
    image:
      'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Fitness Studios',
    meta: 'Yoga, pilates, and training hours that still have room.',
    icon: 'fa-spa',
    href: 'Yoga Studios',
    image:
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [service, setService] = useState('');
  const [location, setLocation] = useState('');
  const [locating, setLocating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const persistSearch = (query: string) => {
    try {
      sessionStorage.setItem(
        'hourslot_explore_q',
        JSON.stringify({ q: query.trim(), location: location.trim() })
      );
    } catch {
      /* ignore quota */
    }
  };

  const goSearch = (query = service) => {
    persistSearch(query);
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
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
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocation('Near you');
        setLocating(false);
      },
      () => {
        setLocation('Near you');
        setLocating(false);
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className={styles.page}>
      <header className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.brand}>
            <Image src="/logo-hourslot.png" alt="HourSlot" width={148} height={44} priority className={styles.logo} />
          </Link>

          <nav className={styles.navCenter} aria-label="Primary">
            <Link href="/profile/explore">Explore</Link>
            <a href="#businesses">For Businesses</a>
            <a href="#pricing">Pricing</a>
          </nav>

          <div className={styles.navActions}>
            <Link href="/auth/login" className={styles.navLink}>
              Sign in
            </Link>
            <Link href="/auth/register" className={`btn btn-primary btn-sm ${styles.navCta}`}>
              Get started
            </Link>
            <button
              type="button"
              className={styles.menuBtn}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <i className={`fa-solid ${menuOpen ? 'fa-xmark' : 'fa-bars'}`} />
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className={styles.mobileMenu}>
            <Link href="/profile/explore" onClick={() => setMenuOpen(false)}>Explore</Link>
            <a href="#businesses" onClick={() => setMenuOpen(false)}>For Businesses</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
            <Link href="/auth/login" onClick={() => setMenuOpen(false)}>Sign in</Link>
            <Link href="/auth/register" className="btn btn-primary" onClick={() => setMenuOpen(false)}>
              Get started
            </Link>
          </div>
        )}
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden />
        <div className={styles.floatCard} aria-hidden>
          <span className={styles.floatDot} />
          <div>
            <strong>Fade Studio</strong>
            <p>Today · 2:30 PM confirmed</p>
          </div>
        </div>
        <div className={`${styles.floatCard} ${styles.floatCardAlt}`} aria-hidden>
          <i className="fa-solid fa-clock" />
          <div>
            <strong>Next open slot</strong>
            <p>45 min from now</p>
          </div>
        </div>

        <div className={styles.heroContent}>
          <p className={styles.badge}>
            <span aria-hidden>✦</span> The smart appointment marketplace
          </p>
          <h1 className={styles.heroTitle}>
            Turn empty hours into <em>booked ones.</em>
          </h1>
          <p className={styles.heroSub}>
            Discover nearby businesses and lock a real slot.
            Owners fill the calendar. You keep the hour.
          </p>

          <form className={styles.search} onSubmit={handleSearch}>
            <label className={styles.searchField}>
              <i className="fa-solid fa-magnifying-glass" aria-hidden />
              <input
                type="text"
                placeholder="What are you looking for?"
                value={service}
                onChange={(e) => setService(e.target.value)}
                aria-label="Service or business"
              />
            </label>
            <span className={styles.searchDivider} aria-hidden />
            <label className={styles.searchField}>
              <i className="fa-solid fa-location-dot" aria-hidden />
              <input
                type="text"
                placeholder="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                aria-label="Location"
              />
              <button
                type="button"
                className={styles.gpsBtn}
                onClick={locateMe}
                aria-label="Use my location"
                title="Use my location"
              >
                <i className={`fa-solid ${locating ? 'fa-circle-notch fa-spin' : 'fa-location-crosshairs'}`} />
              </button>
            </label>
            <button type="submit" className={styles.searchBtn}>
              Search <i className="fa-solid fa-arrow-right" aria-hidden />
            </button>
          </form>

          <div className={styles.popular}>
            <span>Popular:</span>
            {POPULAR.map((tag) => (
              <button key={tag} type="button" onClick={() => { setService(tag); goSearch(tag); }}>
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.trust} aria-label="Why HourSlot">
        <div className={styles.trustInner}>
          <p><i className="fa-solid fa-shield-halved" aria-hidden /> Conflict-safe booking</p>
          <p><i className="fa-solid fa-tag" aria-hidden /> Peak pricing, shown up front</p>
          <p><i className="fa-solid fa-credit-card" aria-hidden /> Pay online or at the venue</p>
          <p><i className="fa-solid fa-rotate" aria-hidden /> Reschedule in a few taps</p>
        </div>
      </section>

      <section className={styles.section} id="categories">
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.displayTitle}>Explore by category</h2>
            <p className={styles.sectionSub}>Start with what you need. Nearby availability comes next.</p>
          </div>
          <Link href="/profile/explore" className={styles.textLink}>
            View all categories <i className="fa-solid fa-arrow-right" aria-hidden />
          </Link>
        </div>
        <div className={styles.catGrid}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              type="button"
              className={styles.catCard}
              onClick={() => { setService(cat.href); goSearch(cat.href); }}
            >
              <Image src={cat.image} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className={styles.catImg} />
              <span className={styles.catShade} />
              <span className={styles.catIcon} aria-hidden>
                <i className={`fa-solid ${cat.icon}`} />
              </span>
              <span className={styles.catCopy}>
                <strong>{cat.name}</strong>
                <span>{cat.meta}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.how}`} id="how">
        <h2 className={styles.displayTitle}>How HourSlot works</h2>
        <p className={styles.sectionSub}>One marketplace. Two sides. Zero spreadsheet chaos.</p>
        <div className={styles.howGrid}>
          <article className={styles.howCard}>
            <header>
              <span className={styles.howIcon}><i className="fa-regular fa-user" /></span>
              <h3>For customers</h3>
            </header>
            <ol>
              <li>
                <span>1</span>
                <div>
                  <strong>Discover</strong>
                  <p>Search nearby businesses by category, location, and real ratings.</p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>Book instantly</strong>
                  <p>Pick a service, preferred staff, and a slot that actually exists.</p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>Manage</strong>
                  <p>Confirmations, reschedules, packages, and reviews in one place.</p>
                </div>
              </li>
            </ol>
            <Link href="/profile/explore" className="btn btn-primary">
              Book appointments
            </Link>
          </article>

          <article className={`${styles.howCard} ${styles.howCardDark}`} id="businesses">
            <header>
              <span className={styles.howIcon}><i className="fa-solid fa-store" /></span>
              <h3>For businesses</h3>
            </header>
            <ol>
              <li>
                <span>1</span>
                <div>
                  <strong>List your services</strong>
                  <p>Branches, staff, hours, gallery, and peak pricing — set once.</p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>Fill empty slots</strong>
                  <p>Live availability with conflict-safe booking on a real calendar.</p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>Grow revenue</strong>
                  <p>Packages, online pay, and a week that fills itself.</p>
                </div>
              </li>
            </ol>
            <Link href="/auth/register?role=business" className={styles.ghostBtn}>
              List your business
            </Link>
          </article>
        </div>
      </section>

      <section className={styles.preview}>
        <div className={styles.previewInner}>
          <div className={styles.previewCopy}>
            <p className={styles.eyebrow}>Live calendar</p>
            <h2 className={styles.displayTitle}>See the week fill itself.</h2>
            <p>
              Owners get a calm ops board: staff, services, and visits in one view.
              Customers see honest openings — including peak hours — before they commit.
            </p>
            <ul className={styles.previewList}>
              <li><i className="fa-solid fa-check" /> Multi-branch staff &amp; catalogs</li>
              <li><i className="fa-solid fa-check" /> Packages with remaining sessions</li>
              <li><i className="fa-solid fa-check" /> Stripe or pay-at-venue</li>
            </ul>
            <Link href="/auth/register?role=business" className="btn btn-primary">
              Start listing
            </Link>
          </div>
          <div className={styles.calMock} aria-hidden>
            <div className={styles.calHead}>
              <span>This week</span>
              <strong>Studio calendar</strong>
            </div>
            <div className={styles.calDays}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
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
            <Link href="/auth/register?role=customer" className="btn btn-secondary">
              Create a free account
            </Link>
          </article>
          <article className={`${styles.priceCard} ${styles.priceCardAccent}`}>
            <p className={styles.priceKicker}>Businesses</p>
            <h3>List &amp; fill slots</h3>
            <p className={styles.priceAmt}>$0<span> to start</span></p>
            <ul>
              <li>Branches, staff, and live calendar</li>
              <li>Peak pricing &amp; packages</li>
              <li>Online pay or pay at venue</li>
            </ul>
            <Link href="/auth/register?role=business" className="btn btn-primary">
              List your business
            </Link>
          </article>
        </div>
      </section>

      <section className={styles.finalCta}>
        <p className={styles.badge}>Ready when you are</p>
        <h2 className={styles.displayTitle}>Join HourSlot and turn empty hours into booked ones.</h2>
        <p>One calm workspace for discovery, booking, and the visit that follows.</p>
        <div className={styles.heroCtas}>
          <Link href="/auth/register" className="btn btn-primary">
            Get started
          </Link>
          <Link href="/auth/login" className={styles.ghostBtn}>
            Sign in
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <Image src="/logo-hourslot.png" alt="HourSlot" width={120} height={36} className={styles.footerLogo} />
            <p>The smart marketplace for effortless scheduling — customers find the hour, businesses fill it.</p>
          </div>
          <div>
            <h4>Product</h4>
            <Link href="/profile/explore">Explore</Link>
            <a href="#how">Booking system</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div>
            <h4>Resources</h4>
            <Link href="/auth/register">Create account</Link>
            <Link href="/auth/login">Sign in</Link>
            <a href="#how">How it works</a>
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

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { loginHref } from '@/lib/auth-redirect';
import type { ServicePackage } from '@/lib/types';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import styles from './business-profile.module.css';

const LocationMap = dynamic(() => import('@/components/LocationMap'), {
  ssr: false,
  loading: () => <Skeleton variant="card" height={220} />,
});

interface Branch {
  id: number;
  name: string;
  address: string;
  phoneNumber?: string;
  latitude?: number;
  longitude?: number;
}

interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
}

interface Staff {
  id: number;
  name: string;
  specialty?: string;
  designation?: string;
  rating?: number;
}

interface Review {
  id: number;
  customer: { user: { firstName: string; lastName: string } };
  rating: number;
  comment?: string;
  createdAt: string;
}

interface WorkingHour {
  id: number;
  dayOfWeek: number;
  startTime?: string;
  endTime?: string;
  closed: boolean;
}

interface BusinessProfile {
  business: {
    id: number;
    name: string;
    description?: string;
    logoUrl?: string;
    galleryUrls?: string;
    verified?: boolean;
  };
  branches: Branch[];
  services: Service[];
  staff: Staff[];
  reviews: Review[];
  packages?: ServicePackage[];
  averageRating: number;
}

function serviceIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('consult')) return 'fa-comments';
  if (n.includes('color') || n.includes('dye')) return 'fa-palette';
  if (n.includes('cut') || n.includes('hair')) return 'fa-scissors';
  if (n.includes('massage') || n.includes('spa') || n.includes('facial')) return 'fa-spa';
  if (n.includes('train') || n.includes('fitness') || n.includes('yoga')) return 'fa-dumbbell';
  if (n.includes('repair') || n.includes('fix')) return 'fa-wrench';
  return 'fa-calendar-check';
}

export default function BusinessProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [serviceFilter, setServiceFilter] = useState('All');
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [preferredStaffId, setPreferredStaffId] = useState<number | null>(null);

  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [profileData, favData] = await Promise.all([
        apiFetch<BusinessProfile>(`/api/discover/business/${id}`, { skipAuth: true }),
        apiFetch<{ business: { id: number } }[]>('/api/favorites').catch(() => []),
      ]);
      setProfile(profileData);
      setFavorites(favData.map((f) => f.business.id));
      if (profileData.services[0]) setSelectedServiceId(profileData.services[0].id);
      if (profileData.branches.length > 0) {
        const hours = await apiFetch<WorkingHour[]>(
          `/api/public/branches/${profileData.branches[0].id}/working-hours`,
          { skipAuth: true }
        );
        setWorkingHours(hours);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to load business profile details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleToggleFavorite = async () => {
    if (!profile) return;
    if (!isAuthenticated) {
      router.push(loginHref(`${window.location.pathname}${window.location.search}`));
      return;
    }
    const businessId = profile.business.id;
    const isFav = favorites.includes(businessId);
    setError(null);
    setSuccess(null);
    try {
      if (isFav) {
        await apiFetch(`/api/favorites/${businessId}`, { method: 'DELETE' });
        setFavorites((prev) => prev.filter((fid) => fid !== businessId));
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

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: profile?.business.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        setSuccess('Link copied to clipboard.');
      }
    } catch {
      /* ignore cancel */
    }
  };

  const handleOpenPurchaseModal = (pkg: ServicePackage) => {
    if (!isAuthenticated) {
      router.push(loginHref(`${window.location.pathname}${window.location.search}`));
      return;
    }
    setSelectedPackage(pkg);
    setShowPurchaseModal(true);
  };

  const handlePurchaseSubmit = async (method: 'ONLINE' | 'VENUE') => {
    if (!selectedPackage) return;
    setPurchaseLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (method === 'ONLINE') {
        const data = await apiFetch<{ url: string }>(
          `/api/payments/checkout?packageId=${selectedPackage.id}`,
          { method: 'POST' }
        );
        if (data?.url) window.location.href = data.url;
        else throw new Error('Failed to generate payment url');
      } else {
        await apiFetch(`/api/packages/${selectedPackage.id}/purchase?paymentMethod=VENUE`, {
          method: 'POST',
        });
        setSuccess(`Package "${selectedPackage.name}" purchased. Available in your wallet.`);
        setShowPurchaseModal(false);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Package purchase failed.');
      setShowPurchaseModal(false);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const continueBookHref = () => {
    if (!profile || !selectedServiceId) return `/profile/business/${id}`;
    const params = new URLSearchParams({ serviceId: String(selectedServiceId) });
    if (profile.branches[0]) params.set('branchId', String(profile.branches[0].id));
    if (preferredStaffId) params.set('staffId', String(preferredStaffId));
    return `/profile/book/${profile.business.id}?${params.toString()}`;
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="card" height={280} />
        <div className={styles.skeletonRow}>
          <Skeleton variant="card" height={420} />
          <Skeleton variant="card" height={420} />
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className={styles.page}>
        <EmptyState
          icon="fa-store-slash"
          title="Business not found"
          description={error}
          actionLabel="Back to explore"
          onAction={() => router.push('/profile/explore')}
        />
      </div>
    );
  }

  if (!profile) return null;

  const { business, branches, services, staff, reviews, averageRating } = profile;
  const isFav = favorites.includes(business.id);
  const gallery = business.galleryUrls
    ? String(business.galleryUrls)
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean)
    : [];
  const bannerSrc = gallery[0] || business.logoUrl || null;
  const primaryBranch = branches[0];
  const hasCoords =
    primaryBranch &&
    Number.isFinite(primaryBranch.latitude) &&
    Number.isFinite(primaryBranch.longitude);
  const mapQuery = encodeURIComponent(primaryBranch?.address || business.name);
  const selectedService = services.find((s) => s.id === selectedServiceId) || null;
  const packages = profile.packages || [];
  const preferredStaff = staff.find((s) => s.id === preferredStaffId) || null;

  const filters = (() => {
    const tags = new Set<string>(['All']);
    let hasConsult = false;
    let hasOther = false;
    services.forEach((s) => {
      if (s.name.toLowerCase().includes('consult')) hasConsult = true;
      else hasOther = true;
    });
    if (hasConsult) tags.add('Consultations');
    if (hasOther) tags.add('Services');
    return Array.from(tags);
  })();

  const filteredServices = services.filter((s) => {
    if (serviceFilter === 'All') return true;
    if (serviceFilter === 'Consultations') return s.name.toLowerCase().includes('consult');
    return !s.name.toLowerCase().includes('consult');
  });

  const amenities = [
    business.verified ? { icon: 'fa-certificate', label: 'Verified' } : { icon: 'fa-shield-halved', label: 'Trusted' },
    workingHours.some((w) => !w.closed) ? { icon: 'fa-clock', label: 'Open hours' } : { icon: 'fa-leaf', label: 'Eco-Friendly' },
    hasCoords ? { icon: 'fa-wheelchair', label: 'Accessible' } : { icon: 'fa-store', label: 'Local venue' },
    { icon: 'fa-square-parking', label: 'Free Parking' },
  ];

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        {bannerSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerSrc} alt="" className={styles.heroImg} />
        ) : (
          <div className={styles.heroFallback} />
        )}
        <div className={styles.heroShade} />
        <div className={styles.heroContent}>
          <div className={styles.ratingPill}>
            <i className="fa-solid fa-star" />
            {averageRating > 0 ? averageRating.toFixed(1) : 'New'}
            <span>({reviews.length} Reviews)</span>
          </div>
          <h1>
            {business.name}
            {business.verified && <i className={`fa-solid fa-circle-check ${styles.verified}`} title="Verified" />}
          </h1>
          {primaryBranch?.address && (
            <p className={styles.loc}>
              <i className="fa-solid fa-location-dot" />
              {primaryBranch.address}
            </p>
          )}
        </div>
        <div className={styles.heroActions}>
          <button
            type="button"
            className={`${styles.roundBtn} ${isFav ? styles.roundBtnOn : ''}`}
            onClick={handleToggleFavorite}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <i className={`fa-${isFav ? 'solid' : 'regular'} fa-heart`} />
            <span>Favorite</span>
          </button>
          <button type="button" className={styles.roundBtn} onClick={handleShare} aria-label="Share">
            <i className="fa-solid fa-arrow-up-from-bracket" />
            <span>Share</span>
          </button>
        </div>
      </section>

      {(success || error) && (
        <div className={success ? 'success-alert' : 'error-alert'} style={{ marginBottom: 16 }}>
          <i className={`fa-solid ${success ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} /> {success || error}
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={styles.section}>
            <h2>About the business</h2>
            <p className={styles.aboutText}>
              {business.description?.trim() ||
                'Browse services below and book a real open slot. Availability updates live from the business calendar.'}
            </p>
            <div className={styles.amenityRow}>
              {amenities.map((a) => (
                <div key={a.label} className={styles.amenity}>
                  <span className={styles.amenityIcon}>
                    <i className={`fa-solid ${a.icon}`} />
                  </span>
                  <span>{a.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h2>Service Menu</h2>
              <div className={styles.chips}>
                {filters.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`${styles.chip} ${serviceFilter === f ? styles.chipOn : ''}`}
                    onClick={() => setServiceFilter(f)}
                  >
                    {f === 'All' ? 'All Services' : f}
                  </button>
                ))}
              </div>
            </div>

            {filteredServices.length === 0 ? (
              <EmptyState icon="fa-scissors" title="No services listed" description="This business has not published services yet." />
            ) : (
              <div className={styles.serviceList}>
                {filteredServices.map((s, idx) => {
                  const on = selectedServiceId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`${styles.serviceRow} ${on ? styles.serviceRowOn : ''}`}
                      onClick={() => setSelectedServiceId(s.id)}
                    >
                      {idx === 0 && <span className={styles.popularTag}>Popular</span>}
                      <span className={styles.serviceIcon}>
                        <i className={`fa-solid ${serviceIcon(s.name)}`} />
                      </span>
                      <div className={styles.serviceCopy}>
                        <strong>{s.name}</strong>
                        <p>{s.description || `${s.durationMinutes}-minute appointment with live availability.`}</p>
                      </div>
                      <div className={styles.serviceMeta}>
                        <span>
                          <i className="fa-regular fa-clock" /> {s.durationMinutes} mins
                        </span>
                        <em>${s.price.toFixed(0)}</em>
                      </div>
                      <span className={`${styles.selectBtn} ${on ? styles.selectBtnOn : ''}`}>
                        {on ? 'Selected' : 'Select'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {packages.length > 0 && (
            <section className={styles.section}>
              <h2>Packages</h2>
              <div className={styles.packageList}>
                {packages.map((pkg) => (
                  <div key={pkg.id} className={styles.packageRow}>
                    <div>
                      <strong>{pkg.name}</strong>
                      <p>
                        {pkg.sessionsCount} sessions
                        {pkg.expiryDays > 0 ? ` · ${pkg.expiryDays} days validity` : ''}
                      </p>
                    </div>
                    <div className={styles.packageRight}>
                      <em>${pkg.price.toFixed(2)}</em>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => handleOpenPurchaseModal(pkg)}>
                        Buy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className={styles.section}>
            <h2>Our Team</h2>
            {staff.length === 0 ? (
              <EmptyState icon="fa-user-group" title="No team listed" description="You can still book with any available staff." />
            ) : (
              <div className={styles.teamGrid}>
                {staff.map((s) => {
                  const preferred = preferredStaffId === s.id;
                  return (
                    <article key={s.id} className={styles.teamCard}>
                      <div className={styles.teamAvatar}>{s.name.charAt(0)}</div>
                      <div className={styles.teamBody}>
                        <strong>{s.name}</strong>
                        <span className={styles.teamRole}>{s.specialty || s.designation || 'Team member'}</span>
                        <span className={styles.teamRating}>
                          <i className="fa-solid fa-star" />
                          {typeof s.rating === 'number' && s.rating > 0 ? s.rating.toFixed(1) : '5.0'}
                        </span>
                        <p>
                          Available for bookings at this location. Select a service, then continue to pick a time
                          {preferred ? ` with ${s.name.split(' ')[0]}` : ''}.
                        </p>
                        <button
                          type="button"
                          className={styles.viewProfile}
                          onClick={() => setPreferredStaffId(preferred ? null : s.id)}
                        >
                          {preferred ? 'Preferred' : `Prefer ${s.name.split(' ')[0]}`}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h2>Location</h2>
            <div className={styles.mapWrap}>
              {hasCoords ? (
                <LocationMap
                  markers={[
                    {
                      id: primaryBranch!.id,
                      lat: primaryBranch!.latitude as number,
                      lng: primaryBranch!.longitude as number,
                      label: primaryBranch!.name,
                    },
                  ]}
                  height={260}
                  zoom={15}
                />
              ) : (
                <div className={styles.mapFallback}>
                  <i className="fa-solid fa-map-location-dot" />
                  <span>{primaryBranch?.address || 'Address unavailable'}</span>
                </div>
              )}
              <a
                className={styles.directionsCard}
                href={
                  hasCoords
                    ? `https://www.openstreetmap.org/?mlat=${primaryBranch!.latitude}&mlon=${primaryBranch!.longitude}#map=16/${primaryBranch!.latitude}/${primaryBranch!.longitude}`
                    : `https://www.openstreetmap.org/search?query=${mapQuery}`
                }
                target="_blank"
                rel="noreferrer"
              >
                <span className={styles.directionsIcon}>
                  <i className="fa-solid fa-car" />
                </span>
                <span>
                  <strong>Get Directions</strong>
                  <em>{primaryBranch?.address || 'Open in maps'}</em>
                </span>
              </a>
            </div>
          </section>
        </div>

        <aside className={styles.bookingRail}>
          <div className={styles.bookingCard}>
            <header className={styles.bookingHead}>
              <h3>Your Booking</h3>
              <span className={styles.countBadge}>{selectedService ? '1 Service' : '0 Services'}</span>
            </header>

            {selectedService ? (
              <div className={styles.bookingService}>
                <div>
                  <strong>{selectedService.name}</strong>
                  <p>{selectedService.durationMinutes} mins</p>
                </div>
                <em>${selectedService.price.toFixed(0)}</em>
              </div>
            ) : (
              <p className={styles.bookingHint}>Select a service to continue.</p>
            )}

            {preferredStaff && (
              <p className={styles.bookingHint} style={{ marginTop: 8 }}>
                Preferred staff: <strong>{preferredStaff.name}</strong>
              </p>
            )}

            <div className={styles.bookingTotal}>
              <span>Total</span>
              <strong>${selectedService ? selectedService.price.toFixed(0) : '0'}</strong>
            </div>

            <Link
              href={continueBookHref()}
              className={styles.continueBtn}
              aria-disabled={!selectedService}
              onClick={(e) => {
                if (!selectedService) e.preventDefault();
              }}
            >
              Continue to schedule <i className="fa-solid fa-arrow-right" />
            </Link>
            <p className={styles.noCharge}>Next: pick a time, then checkout. You won&apos;t be charged yet.</p>
          </div>
        </aside>
      </div>

      <Modal
        open={showPurchaseModal && !!selectedPackage}
        title={selectedPackage ? `Purchase ${selectedPackage.name}` : 'Purchase package'}
        onClose={() => setShowPurchaseModal(false)}
        footer={
          <button type="button" className="btn btn-outline" onClick={() => setShowPurchaseModal(false)} disabled={purchaseLoading}>
            Cancel
          </button>
        }
      >
        {selectedPackage && (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0, lineHeight: 1.5 }}>
              Choose payment for <strong>{selectedPackage.name}</strong> ({selectedPackage.sessionsCount} sessions) —{' '}
              <strong>${selectedPackage.price.toFixed(2)}</strong>.
            </p>
            <div className={styles.purchaseChoices}>
              <button type="button" className="btn btn-primary" onClick={() => handlePurchaseSubmit('ONLINE')} disabled={purchaseLoading}>
                <i className="fa-solid fa-credit-card" /> Pay online
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => handlePurchaseSubmit('VENUE')} disabled={purchaseLoading}>
                <i className="fa-solid fa-store" /> Pay at venue
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

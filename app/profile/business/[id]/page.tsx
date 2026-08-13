'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type { ServicePackage } from '@/lib/types';
import Tabs from '@/components/Tabs';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import styles from './business-profile.module.css';

const LocationMap = dynamic(() => import('@/components/LocationMap'), {
  ssr: false,
  loading: () => <Skeleton variant="card" height={180} />,
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
}

interface Review {
  id: number;
  customer: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
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

export default function BusinessProfilePage() {
  const { id } = useParams();

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('services');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<'All' | 'Consultation' | 'Treatment'>('All');

  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  const handleOpenPurchaseModal = (pkg: ServicePackage) => {
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
        if (data?.url) {
          window.location.href = data.url;
        } else {
          throw new Error('Failed to generate payment url');
        }
      } else {
        await apiFetch(`/api/packages/${selectedPackage.id}/purchase?paymentMethod=VENUE`, {
          method: 'POST',
        });
        setSuccess(`Package "${selectedPackage.name}" purchased. Available in your wallet.`);
        setShowPurchaseModal(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Package purchase failed.');
      setShowPurchaseModal(false);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [profileData, favData] = await Promise.all([
        apiFetch<BusinessProfile>(`/api/discover/business/${id}`),
        apiFetch<{ business: { id: number } }[]>('/api/favorites').catch(() => []),
      ]);
      setProfile(profileData);
      setFavorites(favData.map((f) => f.business.id));

      if (profileData.branches.length > 0) {
        const hours = await apiFetch<WorkingHour[]>(
          `/api/public/branches/${profileData.branches[0].id}/working-hours`,
          { skipAuth: true }
        );
        setWorkingHours(hours);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load business profile details.');
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

  const renderStars = (rating: number) => {
    const stars = [];
    const floor = Math.floor(rating || 0);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i
          key={i}
          className={`fa-${i <= floor ? 'solid' : 'regular'} fa-star`}
          style={{ color: i <= floor ? '#f59e0b' : '#cbd5e1' }}
        />
      );
    }
    return stars;
  };

  const getDayName = (dayNum: number) => {
    const names = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return names[dayNum] || '';
  };

  const formatLocalTime = (timeStr?: string) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${parts[1]} ${ampm}`;
  };

  if (loading) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.skeletonStack}>
          <Skeleton variant="card" height={220} />
          <Skeleton variant="card" height={100} />
          <Skeleton variant="row" count={4} />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={styles.profileContainer}>
        <EmptyState
          icon="fa-store-slash"
          title="Business not found"
          description={error || 'This business profile could not be loaded.'}
          actionLabel="Back to explore"
          onAction={() => {
            window.location.href = '/profile/explore';
          }}
        />
      </div>
    );
  }

  const { business, branches, services, staff, reviews, averageRating } = profile;
  const isFav = favorites.includes(business.id);
  const gallery = business.galleryUrls
    ? String(business.galleryUrls)
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean)
    : [];
  const bannerSrc = gallery[0] || business.logoUrl || null;
  const mapQuery = encodeURIComponent(branches[0]?.address || business.name);
  const primaryBranch = branches[0];
  const hasCoords =
    primaryBranch &&
    Number.isFinite(primaryBranch.latitude) &&
    Number.isFinite(primaryBranch.longitude);

  const filteredServices = services.filter((s) => {
    if (selectedServiceFilter === 'All') return true;
    if (selectedServiceFilter === 'Consultation') {
      return s.name.toLowerCase().includes('consult') || s.name.toLowerCase().includes('check');
    }
    return !s.name.toLowerCase().includes('consult') && !s.name.toLowerCase().includes('check');
  });

  const currentDayOfWeek = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const packages = profile.packages || [];

  const tabItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'services', label: 'Services' },
    ...(packages.length > 0 ? [{ id: 'packages', label: 'Packages' }] : []),
    { id: 'staff', label: 'Staff' },
    { id: 'reviews', label: `Reviews (${reviews.length})` },
  ];

  return (
    <div className={styles.profileContainer}>
      <div className={styles.bannerContainer}>
        {bannerSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerSrc} alt={`${business.name} banner`} className={styles.bannerImage} />
        ) : (
          <div className={styles.bannerFallback}>{business.name}</div>
        )}
      </div>

      <div className={`surface ${styles.businessHeaderCard}`}>
        <div className={styles.logoBadgeCircle}>
          <i className="fa-solid fa-store" />
        </div>

        <div className={styles.headerInfo}>
          <div className={styles.titleRow}>
            <h2>{business.name}</h2>
            {business.verified && (
              <i className={`fa-solid fa-circle-check ${styles.verified}`} title="Verified provider" />
            )}
          </div>
          {business.description && <p className={styles.tagline}>{business.description}</p>}

          <div className={styles.ratingAndLocation}>
            <span className={styles.starsWrapper}>{renderStars(averageRating)}</span>
            <strong style={{ color: 'var(--text-main)' }}>
              {averageRating > 0 ? averageRating.toFixed(1) : '—'}
            </strong>
            <span>({reviews.length} reviews)</span>
            <span style={{ color: 'var(--border-color)' }}>·</span>
            <span>
              <i className="fa-solid fa-location-dot" /> {branches[0]?.name || 'Main location'}
            </span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <Link href={`/profile/book/${business.id}`} className="btn btn-primary">
            Book now
          </Link>
          <button
            type="button"
            className={`${styles.iconActionBtn} ${isFav ? styles.isFavorite : ''}`}
            onClick={handleToggleFavorite}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <i className={`fa-${isFav ? 'solid' : 'regular'} fa-heart`} />
          </button>
        </div>
      </div>

      {success && (
        <div className="success-alert" style={{ margin: '16px 0 0' }}>
          <i className="fa-solid fa-circle-check" /> {success}
        </div>
      )}
      {error && (
        <div className="error-alert" style={{ margin: '16px 0 0' }}>
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <Tabs tabs={tabItems} active={activeTab} onChange={setActiveTab} />
      </div>

      <div className={styles.detailsLayoutGrid}>
        <div className={styles.leftColumn}>
          {activeTab === 'overview' && (
            <div className={`surface ${styles.panel}`}>
              <h3>About {business.name}</h3>
              <p className={styles.panelIntro}>
                {business.description?.trim() ||
                  'This provider has not added a description yet. Browse services and packages to book.'}
              </p>
            </div>
          )}

          {activeTab === 'services' && (
            <div className={`surface ${styles.panel}`}>
              <div className={styles.servicesHeader}>
                <h3>Available services</h3>
                <div className={styles.filterTags}>
                  {(['All', 'Consultation', 'Treatment'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={selectedServiceFilter === f ? styles.filterActive : ''}
                      onClick={() => setSelectedServiceFilter(f)}
                    >
                      {f === 'Treatment' ? 'Other' : f}
                    </button>
                  ))}
                </div>
              </div>

              {filteredServices.length === 0 ? (
                <EmptyState
                  icon="fa-scissors"
                  title="No services listed"
                  description="This business has not published services in this filter yet."
                />
              ) : (
                <div className={styles.servicesList}>
                  {filteredServices.map((s) => (
                    <div key={s.id} className={styles.serviceItemCard}>
                      <div className={styles.serviceLeftBlock}>
                        <div className={styles.serviceIconCircle}>
                          <i className="fa-solid fa-calendar-check" />
                        </div>
                        <div>
                          <h5>{s.name}</h5>
                          {s.description && <p>{s.description}</p>}
                          <span className={styles.serviceDuration}>
                            <i className="fa-regular fa-clock" /> {s.durationMinutes} min
                          </span>
                        </div>
                      </div>
                      <div className={styles.serviceRightBlock}>
                        <span className={styles.servicePrice}>${s.price.toFixed(2)}</span>
                        <Link
                          href={`/profile/book/${business.id}?serviceId=${s.id}`}
                          className="btn btn-outline btn-sm"
                        >
                          Book
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'packages' && (
            <div className={`surface ${styles.panel}`}>
              <h3>Service packages</h3>
              <p className={styles.panelIntro} style={{ marginBottom: 16 }}>
                Buy sessions in bulk and redeem them when you book.
              </p>
              {packages.length === 0 ? (
                <EmptyState
                  icon="fa-gift"
                  title="No packages"
                  description="This business has not published packages yet."
                />
              ) : (
                <div className={styles.servicesList}>
                  {packages.map((pkg) => (
                    <div key={pkg.id} className={styles.serviceItemCard}>
                      <div className={styles.serviceLeftBlock}>
                        <div
                          className={styles.serviceIconCircle}
                          style={{ background: 'rgba(91, 184, 140, 0.12)', color: 'var(--accent-secondary)' }}
                        >
                          <i className="fa-solid fa-gift" />
                        </div>
                        <div>
                          <h5>{pkg.name}</h5>
                          {pkg.description && <p>{pkg.description}</p>}
                          <span className={styles.serviceDuration}>
                            <i className="fa-solid fa-circle-check" /> {pkg.sessionsCount} sessions
                            {pkg.expiryDays > 0 ? ` · ${pkg.expiryDays} days validity` : ''}
                          </span>
                          {pkg.services && pkg.services.length > 0 && (
                            <div className={styles.serviceMeta}>
                              Valid for: {pkg.services.map((s) => s.name).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={styles.serviceRightBlock}>
                        <span className={styles.servicePrice}>${pkg.price.toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => handleOpenPurchaseModal(pkg)}
                          className="btn btn-primary btn-sm"
                        >
                          Buy package
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'staff' && (
            <div className={`surface ${styles.panel}`}>
              <h3>Staff</h3>
              {staff.length === 0 ? (
                <EmptyState icon="fa-user-group" title="No staff listed" description="Staff profiles will appear here." />
              ) : (
                <div className={styles.staffGrid}>
                  {staff.map((s) => (
                    <div key={s.id} className={styles.staffCard}>
                      <div className={styles.staffAvatarCircle}>{s.name.charAt(0)}</div>
                      <h5>{s.name}</h5>
                      <span className={styles.staffSpecialty}>{s.specialty || 'Specialist'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className={`surface ${styles.panel}`}>
              <h3>Client reviews</h3>
              {reviews.length === 0 ? (
                <EmptyState
                  icon="fa-star"
                  title="No reviews yet"
                  description="Be the first to leave a review after your appointment."
                />
              ) : (
                <div className={styles.reviewsList}>
                  {reviews.map((r) => (
                    <div key={r.id} className={styles.reviewCard}>
                      <div className={styles.reviewHeader}>
                        <div className={styles.reviewerMeta}>
                          <div className={styles.reviewerAvatarCircle}>
                            {r.customer.user.firstName.charAt(0)}
                            {r.customer.user.lastName.charAt(0)}
                          </div>
                          <div>
                            <h5>
                              {r.customer.user.firstName} {r.customer.user.lastName}
                            </h5>
                            <span className={styles.reviewDate}>
                              {new Date(r.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                        <div className={styles.reviewStars}>{renderStars(r.rating)}</div>
                      </div>
                      {r.comment && <p className={styles.reviewCommentText}>{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.rightColumn}>
          <div className={`surface ${styles.sidebarCard}`}>
            <div className={styles.mapPlaceholderWrapper}>
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
                  height={180}
                  zoom={15}
                />
              ) : (
                <div className={styles.mapFallback}>
                  <i className="fa-solid fa-map-location-dot" />
                  <span>Location coordinates not set</span>
                </div>
              )}
            </div>
            <div className={styles.sidebarCardBody}>
              <h5>{branches[0]?.name || 'Main location'}</h5>
              <p className={styles.sidebarText}>
                <i className="fa-solid fa-location-dot" />
                {branches[0]?.address || 'Address unavailable'}
              </p>
              {hasCoords && (
                <p className={styles.sidebarText}>
                  <i className="fa-solid fa-compass" />
                  {Number(primaryBranch!.latitude).toFixed(5)}, {Number(primaryBranch!.longitude).toFixed(5)}
                </p>
              )}
              {branches[0]?.phoneNumber && (
                <p className={styles.sidebarText}>
                  <i className="fa-solid fa-phone" />
                  {branches[0].phoneNumber}
                </p>
              )}
              <a
                className="btn btn-outline btn-sm"
                href={
                  hasCoords
                    ? `https://www.openstreetmap.org/?mlat=${primaryBranch!.latitude}&mlon=${primaryBranch!.longitude}#map=16/${primaryBranch!.latitude}/${primaryBranch!.longitude}`
                    : `https://www.openstreetmap.org/search?query=${mapQuery}`
                }
                target="_blank"
                rel="noreferrer"
                style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
              >
                <i className="fa-solid fa-location-arrow" /> Get directions
              </a>
            </div>
          </div>

          <div className={`surface ${styles.sidebarCard}`}>
            <div className={styles.sidebarCardHeader}>
              <i className="fa-regular fa-clock" style={{ color: 'var(--accent-primary)' }} />
              <h5>Opening hours</h5>
            </div>
            <div className={styles.workingHoursList}>
              {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
                const config = workingHours.find((w) => w.dayOfWeek === dayNum);
                const isToday = dayNum === currentDayOfWeek;
                return (
                  <div key={dayNum} className={`${styles.hourRow} ${isToday ? styles.hourToday : ''}`}>
                    <span className={styles.hourDayLabel}>
                      {getDayName(dayNum)}
                      {isToday && <span className={styles.todayBadge}>TODAY</span>}
                    </span>
                    <span className={styles.hourValue}>
                      {config ? (
                        config.closed ? (
                          <span className={styles.closed}>Closed</span>
                        ) : (
                          `${formatLocalTime(config.startTime)} – ${formatLocalTime(config.endTime)}`
                        )
                      ) : (
                        'Hours not set'
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={showPurchaseModal && !!selectedPackage}
        title={selectedPackage ? `Purchase ${selectedPackage.name}` : 'Purchase package'}
        onClose={() => setShowPurchaseModal(false)}
        footer={
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setShowPurchaseModal(false)}
            disabled={purchaseLoading}
          >
            Cancel
          </button>
        }
      >
        {selectedPackage && (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0, lineHeight: 1.5 }}>
              Choose payment for <strong>{selectedPackage.name}</strong> (
              {selectedPackage.sessionsCount} sessions) —{' '}
              <strong>${selectedPackage.price.toFixed(2)}</strong>.
            </p>
            <div className={styles.purchaseChoices}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handlePurchaseSubmit('ONLINE')}
                disabled={purchaseLoading}
              >
                <i className="fa-solid fa-credit-card" /> Pay online
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handlePurchaseSubmit('VENUE')}
                disabled={purchaseLoading}
              >
                <i className="fa-solid fa-store" /> Pay at venue
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

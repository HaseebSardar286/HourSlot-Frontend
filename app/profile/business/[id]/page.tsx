'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import styles from './business-profile.module.css';

interface Branch {
  id: number;
  name: string;
  address: string;
  phoneNumber?: string;
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
  };
  branches: Branch[];
  services: Service[];
  staff: Staff[];
  reviews: Review[];
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

  // Tab selections: overview, services, staff, reviews, gallery
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'staff' | 'reviews'>('services');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<'All' | 'Consultation' | 'Treatment'>('All');

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
      setFavorites(favData.map((f: any) => f.business.id));

      // Public working hours for the first branch
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
    } catch (err: any) {
      setError('Could not update favorite status.');
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const floor = Math.floor(rating || 5);
    for (let i = 1; i <= 5; i++) {
      if (i <= floor) {
        stars.push(<i key={i} className="fa-solid fa-star" style={{ color: '#f59e0b' }}></i>);
      } else {
        stars.push(<i key={i} className="fa-regular fa-star" style={{ color: '#cbd5e1' }}></i>);
      }
    }
    return stars;
  };

  const getDayName = (dayNum: number) => {
    switch (dayNum) {
      case 1: return 'Monday';
      case 2: return 'Tuesday';
      case 3: return 'Wednesday';
      case 4: return 'Thursday';
      case 5: return 'Friday';
      case 6: return 'Saturday';
      case 7: return 'Sunday';
      default: return '';
    }
  };

  const formatLocalTime = (timeStr?: string) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    const h = parseInt(parts[0]);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${parts[1]} ${ampm}`;
  };

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <div className="spinner" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={styles.profileContainer}>
        <div className="error-alert"><i className="fa-solid fa-triangle-exclamation"></i> {error || 'Business profile not found.'}</div>
        <Link href="/profile/explore" className="btn btn-outline" style={{ marginTop: '20px' }}>Back to Explore</Link>
      </div>
    );
  }

  const { business, branches, services, staff, reviews, averageRating } = profile;
  const isFav = favorites.includes(business.id);
  const gallery = (business as any).galleryUrls
    ? String((business as any).galleryUrls).split(',').map((u: string) => u.trim()).filter(Boolean)
    : [];
  const bannerSrc = gallery[0] || (business as any).logoUrl || null;
  const mapQuery = encodeURIComponent(branches[0]?.address || business.name);

  // Filter services by consultation / treatment
  const filteredServices = services.filter((s) => {
    if (selectedServiceFilter === 'All') return true;
    if (selectedServiceFilter === 'Consultation') {
      return s.name.toLowerCase().includes('consult') || s.name.toLowerCase().includes('check');
    }
    return !s.name.toLowerCase().includes('consult') && !s.name.toLowerCase().includes('check');
  });

  // Calculate today's ISO day (1 = Monday, 7 = Sunday)
  const currentDayOfWeek = new Date().getDay() === 0 ? 7 : new Date().getDay();

  return (
    <div className={styles.profileContainer}>
      
      <div className={styles.bannerContainer}>
        {bannerSrc ? (
          <img src={bannerSrc} alt={`${business.name} banner`} className={styles.bannerImage} />
        ) : (
          <div
            className={styles.bannerImage}
            style={{
              background: 'linear-gradient(135deg, rgba(26,138,138,0.35), rgba(91,184,140,0.55))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: '2rem',
            }}
          >
            {business.name}
          </div>
        )}
      </div>

      {/* Overlapping Business Profile Main Card */}
      <div className={styles.businessHeaderCard}>
        <div className={styles.logoBadgeCircle}>
          <i className="fa-solid fa-tooth" style={{ fontSize: '2.2rem', color: 'var(--accent-primary)' }}></i>
        </div>

        <div className={styles.headerInfo}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2>{business.name}</h2>
            <i className="fa-solid fa-circle-check" style={{ color: '#3b82f6', fontSize: '1.25rem' }} title="Verified Provider"></i>
          </div>
          <p className={styles.tagline}>{business.description || 'Premium Healthcare & Professional Diagnostics'}</p>
          
          <div className={styles.ratingAndLocation}>
            <span className={styles.starsWrapper}>{renderStars(averageRating)}</span>
            <strong style={{ color: '#0f172a' }}>
              {averageRating > 0 ? averageRating.toFixed(1) : '—'}
            </strong>
            <span style={{ color: '#94a3b8' }}>({reviews.length} Reviews)</span>
            <span style={{ color: '#e2e8f0' }}>•</span>
            <span style={{ color: '#64748b', fontWeight: 600 }}>
              <i className="fa-solid fa-location-dot"></i> {branches[0]?.name || 'Main location'}
            </span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <Link href={`/profile/book/${business.id}`} className={styles.bookNowBtn}>
            Book Now
          </Link>
          <button 
            className={`${styles.iconActionBtn} ${isFav ? styles.isFavorite : ''}`}
            onClick={handleToggleFavorite}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <i className={`fa-${isFav ? 'solid' : 'regular'} fa-heart`}></i>
          </button>
          <button className={styles.iconActionBtn} title="Share Profile">
            <i className="fa-solid fa-share-nodes"></i>
          </button>
        </div>
      </div>

      {success && <div className="success-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-circle-check"></i> {success}</div>}

      {/* Tabs Menu bar */}
      <div className={styles.tabsMenu}>
        <button className={activeTab === 'overview' ? styles.tabActive : ''} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={activeTab === 'services' ? styles.tabActive : ''} onClick={() => setActiveTab('services')}>Services</button>
        <button className={activeTab === 'staff' ? styles.tabActive : ''} onClick={() => setActiveTab('staff')}>Staff</button>
        <button className={activeTab === 'reviews' ? styles.tabActive : ''} onClick={() => setActiveTab('reviews')}>Reviews</button>
      </div>

      {/* Two Column details split grid layout */}
      <div className={styles.detailsLayoutGrid}>
        
        {/* Left Column: Tab contents */}
        <div className={styles.leftColumn}>
          {activeTab === 'overview' && (
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>About {business.name}</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Welcome to {business.name}. We provide specialized treatments powered by cutting-edge technology and certified specialists. Our mission is to provide premium diagnostics, comfortable client care, and painless treatment workflows for local residents.
              </p>
            </div>
          )}

          {activeTab === 'services' && (
            <div>
              <div className={styles.servicesHeader}>
                <h3>Available Services</h3>
                
                {/* Catalog Filter Tags */}
                <div className={styles.filterTags}>
                  <button className={selectedServiceFilter === 'All' ? styles.filterActive : ''} onClick={() => setSelectedServiceFilter('All')}>All</button>
                  <button className={selectedServiceFilter === 'Consultation' ? styles.filterActive : ''} onClick={() => setSelectedServiceFilter('Consultation')}>Consultation</button>
                  <button className={selectedServiceFilter === 'Treatment' ? styles.filterActive : ''} onClick={() => setSelectedServiceFilter('Treatment')}>Aesthetics</button>
                </div>
              </div>

              <div className={styles.servicesList}>
                {filteredServices.map((s) => (
                  <div key={s.id} className={styles.serviceItemCard}>
                    <div className={styles.serviceLeftBlock}>
                      <div className={styles.serviceIconCircle}>
                        <i className="fa-solid fa-tooth"></i>
                      </div>
                      <div>
                        <h5>{s.name}</h5>
                        {s.description && <p>{s.description}</p>}
                        <span className={styles.serviceDuration}>
                          <i className="fa-regular fa-clock"></i> {s.durationMinutes} min
                        </span>
                      </div>
                    </div>

                    <div className={styles.serviceRightBlock}>
                      <span className={styles.servicePrice}>${s.price.toFixed(2)}</span>
                      <Link href={`/profile/book/${business.id}?serviceId=${s.id}`} className={styles.serviceBookBtn}>
                        Book
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'staff' && (
            <div>
              <h3>Our Roster of Specialists</h3>
              <div className={styles.staffGrid}>
                {staff.map((s) => (
                  <div key={s.id} className={styles.staffCard}>
                    <div className={styles.staffAvatarCircle}>
                      {s.name.charAt(0)}
                    </div>
                    <h5>{s.name}</h5>
                    <span className={styles.staffSpecialty}>{s.specialty || 'General Practitioner'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div>
              <h3>Client Reviews</h3>
              <div className={styles.reviewsList}>
                {reviews.map((r) => (
                  <div key={r.id} className={styles.reviewCard}>
                    <div className={styles.reviewHeader}>
                      <div className={styles.reviewerMeta}>
                        <div className={styles.reviewerAvatarCircle}>
                          {r.customer.user.firstName.charAt(0)}{r.customer.user.lastName.charAt(0)}
                        </div>
                        <div>
                          <h5>{r.customer.user.firstName} {r.customer.user.lastName}</h5>
                          <span className={styles.reviewDate}>
                            {new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <div className={styles.reviewStars}>
                        {renderStars(r.rating)}
                      </div>
                    </div>
                    {r.comment && <p className={styles.reviewCommentText}>{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Address Map Contacts & Opening Hours */}
        <div className={styles.rightColumn}>
          {/* Contacts Map Card */}
          <div className={styles.sidebarCard}>
            <div className={styles.mapPlaceholderWrapper}>
              <iframe
                title={`Map for ${business.name}`}
                src={`https://www.google.com/maps?q=${mapQuery}&z=14&output=embed`}
                style={{ border: 0, width: '100%', height: '100%', minHeight: 180 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className={styles.sidebarCardBody}>
              <h5>{branches[0]?.name || 'Main location'}</h5>
              <p className={styles.sidebarText} style={{ marginTop: '8px' }}>
                <i className="fa-solid fa-location-dot" style={{ color: 'var(--accent-primary)' }}></i>
                {branches[0]?.address || 'Address unavailable'}
              </p>
              {branches[0]?.phoneNumber && (
                <p className={styles.sidebarText}>
                  <i className="fa-solid fa-phone" style={{ color: 'var(--accent-primary)' }}></i>
                  {branches[0].phoneNumber}
                </p>
              )}
              
              <a
                className={styles.sidebarDirectionsBtn}
                href={`https://www.openstreetmap.org/search?query=${mapQuery}`}
                target="_blank"
                rel="noreferrer"
              >
                <i className="fa-solid fa-location-arrow"></i> Get Directions
              </a>
            </div>
          </div>

          {/* Opening Hours Card */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardHeader}>
              <i className="fa-regular fa-clock" style={{ fontSize: '1.1rem', color: 'var(--accent-primary)' }}></i>
              <h5 style={{ margin: 0, fontWeight: 700 }}>Opening Hours</h5>
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
                          <span style={{ color: '#ef4444', fontWeight: 600 }}>Closed</span>
                        ) : (
                          `${formatLocalTime(config.startTime)} - ${formatLocalTime(config.endTime)}`
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

    </div>
  );
}

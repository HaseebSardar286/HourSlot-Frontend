'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Composer from '@/components/community/Composer';
import PostCard from '@/components/community/PostCard';
import type { FeedPost, Sidebar } from '@/components/community/types';
import { initials, tone } from '@/components/community/types';
import styles from './community.module.css';

const FEEDS = [
  { id: '', label: 'All posts', icon: 'fa-house' },
  { id: 'REVIEW', label: 'Reviews', icon: 'fa-star' },
  { id: 'QUESTION', label: 'Questions', icon: 'fa-circle-question' },
  { id: 'POST', label: 'Posts & media', icon: 'fa-photo-film' },
];

function PostSkeleton() {
  return (
    <div className={`${styles.card} ${styles.post}`} aria-hidden>
      <div className={styles.postHead}>
        <span className={`${styles.avatar} ${styles.skel}`} />
        <div style={{ flex: 1 }}>
          <div className={styles.skel} style={{ width: '38%', height: 12, borderRadius: 5 }} />
          <div className={styles.skel} style={{ width: '22%', height: 10, borderRadius: 5, marginTop: 8 }} />
        </div>
      </div>
      <div className={styles.skel} style={{ height: 12, borderRadius: 5, marginTop: 16 }} />
      <div className={styles.skel} style={{ width: '80%', height: 12, borderRadius: 5, marginTop: 8 }} />
    </div>
  );
}

function Feed() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const type = params.get('type') || '';
  const communityId = params.get('c') ? Number(params.get('c')) : null;
  const businessId = params.get('business') ? Number(params.get('business')) : null;
  const businessName = params.get('name');
  const q = params.get('q') || '';
  const mine = params.get('author') === 'me';
  const [sort, setSort] = useState<'latest' | 'top'>('latest');

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState('');
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [side, setSide] = useState<Sidebar | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const query = useMemo(() => {
    const s = new URLSearchParams();
    if (type) s.set('type', type);
    if (communityId) s.set('communityId', String(communityId));
    if (businessId) s.set('businessId', String(businessId));
    if (q) s.set('q', q);
    if (mine && user) s.set('authorId', String(user.id));
    s.set('sort', sort);
    return s.toString();
  }, [type, communityId, businessId, q, mine, user, sort]);

  const load = useCallback(
    async (before?: string) => {
      if (before) setMore(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<{ items: FeedPost[]; nextCursor: string }>(
          `/api/community/feed?${query}${before ? `&before=${before}` : ''}`
        );
        setPosts((prev) => (before ? [...prev, ...res.items.filter((p) => !prev.some((x) => x.id === p.id))] : res.items));
        setCursor(res.nextCursor);
      } catch (err) {
        setError((err as { message?: string })?.message || 'Could not load the community feed.');
      } finally {
        setLoading(false);
        setMore(false);
      }
    },
    [query]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    apiFetch<Sidebar>('/api/community/feed/sidebar').then(setSide).catch(() => setSide(null));
  }, []);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !more && !loading) void load(cursor);
    }, { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, more, loading, load]);

  const setParam = (key: string, value: string | null) => {
    const s = new URLSearchParams(params.toString());
    if (value) s.set(key, value);
    else s.delete(key);
    if (key !== 'name' && key === 'business' && !value) s.delete('name');
    router.push(`/community${s.toString() ? `?${s}` : ''}`);
  };

  const community = side?.communities.find((c) => c.id === communityId);
  const heading = mine
    ? 'Your posts'
    : businessId
      ? `Posts about ${businessName || 'this business'}`
      : q
        ? `Results for “${q}”`
        : community
          ? community.name
          : FEEDS.find((f) => f.id === type)?.label || 'All posts';

  return (
    <div className={styles.layout}>
      {/* Left rail */}
      <aside className={styles.leftRail}>
        <nav className={`${styles.card} ${styles.railCard}`} aria-label="Feeds">
          {FEEDS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`${styles.railLink} ${!communityId && !businessId && !q && !mine && type === f.id ? styles.railLinkOn : ''}`}
              onClick={() => router.push(f.id ? `/community?type=${f.id}` : '/community')}
            >
              <i className={`fa-solid ${f.icon}`} aria-hidden /> {f.label}
            </button>
          ))}
          {isAuthenticated && (
            <button
              type="button"
              className={`${styles.railLink} ${mine ? styles.railLinkOn : ''}`}
              onClick={() => router.push('/community?author=me')}
            >
              <i className="fa-solid fa-user" aria-hidden /> My posts
            </button>
          )}
        </nav>

        {side && side.communities.length > 0 && (
          <div className={`${styles.card} ${styles.railCard}`}>
            <h4 className={styles.railTitle}>Cities</h4>
            {side.communities.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`${styles.railLink} ${communityId === c.id ? styles.railLinkOn : ''}`}
                onClick={() => router.push(`/community?c=${c.id}`)}
              >
                <span className={styles.cityDot} style={{ background: tone(c.name) }}>{c.name[0]}</span>
                <span className={styles.railGrow}>{c.name}</span>
                {Number(c.posts) > 0 && <span className={styles.railCount}>{c.posts}</span>}
              </button>
            ))}
          </div>
        )}
      </aside>

      {/* Feed */}
      <section className={styles.feed} aria-label="Community feed">
        <div className={styles.feedHead}>
          <div>
            <h1>{heading}</h1>
            <p>
              {community?.description ||
                (businessId
                  ? 'Reviews, mentions and recommendations from the community.'
                  : 'Real experiences with local businesses and independent providers.')}
            </p>
          </div>
          <div className={styles.sortTabs} role="tablist" aria-label="Sort">
            <button type="button" role="tab" aria-selected={sort === 'latest'} className={sort === 'latest' ? styles.segOn : ''} onClick={() => setSort('latest')}>
              Latest
            </button>
            <button type="button" role="tab" aria-selected={sort === 'top'} className={sort === 'top' ? styles.segOn : ''} onClick={() => setSort('top')}>
              Top
            </button>
          </div>
        </div>

        {(businessId || q || communityId || mine) && (
          <div className={styles.filterChips}>
            {communityId && community && (
              <button type="button" onClick={() => setParam('c', null)}>
                <i className="fa-solid fa-location-dot" /> {community.name} <i className="fa-solid fa-xmark" />
              </button>
            )}
            {businessId && (
              <button type="button" onClick={() => setParam('business', null)}>
                @{businessName || 'business'} <i className="fa-solid fa-xmark" />
              </button>
            )}
            {q && (
              <button type="button" onClick={() => setParam('q', null)}>
                “{q}” <i className="fa-solid fa-xmark" />
              </button>
            )}
            {mine && (
              <button type="button" onClick={() => setParam('author', null)}>
                My posts <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        )}

        <Composer
          key={communityId ?? 'all'}
          communities={side?.communities || []}
          defaultCommunityId={communityId}
          onPosted={(p) => setPosts((prev) => [p, ...prev])}
        />

        {error && (
          <div className={`${styles.card} ${styles.errorCard}`}>
            <i className="fa-solid fa-triangle-exclamation" /> {error}
            <button type="button" className="btn btn-outline btn-sm" onClick={() => void load()}>Try again</button>
          </div>
        )}

        {loading ? (
          <>
            <PostSkeleton />
            <PostSkeleton />
          </>
        ) : posts.length === 0 && !error ? (
          <div className={`${styles.card} ${styles.empty}`}>
            <span className={styles.emptyIcon}><i className="fa-solid fa-comments" /></span>
            <h3>{q || businessId || mine ? 'Nothing here yet' : 'Be the first to post'}</h3>
            <p>
              {businessId
                ? 'No one has written about this business yet. Share your experience.'
                : 'Share a recommendation, review a business you used, or ask the community a question.'}
            </p>
          </div>
        ) : (
          posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              onChange={(next) => setPosts((prev) => prev.map((x) => (x.id === next.id ? next : x)))}
              onRemove={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
            />
          ))
        )}
        <div ref={sentinel} />
        {more && <PostSkeleton />}
        {!loading && !cursor && posts.length > 3 && <p className={styles.endNote}>You&apos;re all caught up.</p>}
      </section>

      {/* Right rail */}
      <aside className={styles.rightRail}>
        <div className={`${styles.card} ${styles.welcome}`}>
          <h4>Duemet Community</h4>
          <p>Honest reviews, photos and tips about local services, from people who booked them.</p>
          {side && (
            <div className={styles.welcomeStats}>
              <span><strong>{side.stats.posts}</strong> posts</span>
              <span><strong>{side.stats.reviews}</strong> reviews</span>
              <span><strong>{side.stats.members}</strong> members</span>
            </div>
          )}
        </div>

        {side && side.trending.length > 0 && (
          <div className={`${styles.card} ${styles.railCard}`}>
            <h4 className={styles.railTitle}>Most talked about</h4>
            {side.trending.map((b) => (
              <div key={b.id} className={styles.trendRow}>
                <span className={styles.miniAvatar} style={{ background: tone(b.name) }}>{initials(b.name)}</span>
                <button
                  type="button"
                  className={styles.trendText}
                  onClick={() => router.push(`/community?business=${b.id}&name=${encodeURIComponent(b.name)}`)}
                >
                  <strong>
                    {b.name}
                    {b.verified && <i className="fa-solid fa-circle-check" aria-label="Verified" />}
                  </strong>
                  <em>{b.mentions} {Number(b.mentions) === 1 ? 'mention' : 'mentions'} this month</em>
                </button>
                <Link href={`/b/${b.slug}`} target="_blank" className={styles.iconBtn} aria-label={`Open ${b.name}`}>
                  <i className="fa-solid fa-arrow-up-right-from-square" />
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className={`${styles.card} ${styles.railCard} ${styles.rules}`}>
          <h4 className={styles.railTitle}>Community guidelines</h4>
          <ul>
            <li><i className="fa-solid fa-check" /> Share real, first-hand experiences.</li>
            <li><i className="fa-solid fa-check" /> Be respectful to people and businesses.</li>
            <li><i className="fa-solid fa-check" /> No ads, spam or personal phone numbers.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense fallback={null}>
      <Feed />
    </Suspense>
  );
}

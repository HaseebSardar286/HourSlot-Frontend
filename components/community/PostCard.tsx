'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { loginHref } from '@/lib/auth-redirect';
import RichText from './RichText';
import Thread, { AuthorBadge } from './Thread';
import type { FeedComment, FeedPost, MediaItem } from './types';
import { initials, timeAgo, tone } from './types';
import styles from '@/app/community/community.module.css';

const REPORT_REASONS = ['Spam or advertising', 'Fake review', 'Harassment or hate', 'Inappropriate media', 'Other'];

function Stars({ value }: { value: number }) {
  return (
    <span className={styles.stars} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <i key={n} className={`fa-solid fa-star ${n <= value ? styles.starOn : ''}`} aria-hidden />
      ))}
    </span>
  );
}

function MediaGrid({ media, onOpen }: { media: MediaItem[]; onOpen: (i: number) => void }) {
  if (!media.length) return null;
  const shown = media.slice(0, 4);
  return (
    <div className={`${styles.mediaGrid} ${styles[`media${shown.length}`]}`}>
      {shown.map((m, i) =>
        m.type === 'video' ? (
          <video key={m.url} src={m.url} controls preload="metadata" playsInline className={styles.mediaItem} />
        ) : (
          <button key={m.url} type="button" className={styles.mediaItem} onClick={() => onOpen(i)} aria-label="Open photo">
            <img src={m.url} alt="" loading="lazy" />
            {i === 3 && media.length > 4 && <span className={styles.mediaMore}>+{media.length - 4}</span>}
          </button>
        )
      )}
    </div>
  );
}

export default function PostCard({
  post,
  onChange,
  onRemove,
  expanded = false,
  initialComments,
}: {
  post: FeedPost;
  onChange: (post: FeedPost) => void;
  onRemove: (id: number) => void;
  expanded?: boolean;
  initialComments?: FeedComment[];
}) {
  const { user, isAuthenticated } = useAuth();
  const [showThread, setShowThread] = useState(expanded);
  const [comments, setComments] = useState<FeedComment[] | null>(initialComments ?? null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [clamped, setClamped] = useState(post.body.length > 420 && !expanded);
  const mine = user && Number(user.id) === post.author.id;
  const images = post.media.filter((m) => m.type === 'image');

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 2400);
  };

  const like = async () => {
    if (!isAuthenticated) {
      window.location.href = loginHref('/community');
      return;
    }
    const optimistic = { ...post, likedByMe: !post.likedByMe, likeCount: post.likeCount + (post.likedByMe ? -1 : 1) };
    onChange(optimistic);
    try {
      const res = await apiFetch<{ liked: boolean; likeCount: number }>(`/api/community/feed/posts/${post.id}/like`, { method: 'POST' });
      onChange({ ...post, likedByMe: res.liked, likeCount: res.likeCount });
    } catch {
      onChange(post);
    }
  };

  const toggleThread = async () => {
    const next = !showThread;
    setShowThread(next);
    if (next && comments === null) {
      setLoadingThread(true);
      try {
        const res = await apiFetch<{ comments: FeedComment[] }>(`/api/community/feed/posts/${post.id}`, { skipAuth: true });
        setComments(res.comments);
      } catch {
        setComments([]);
      } finally {
        setLoadingThread(false);
      }
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/community/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: 'Duemet Community' });
        return;
      }
      await navigator.clipboard.writeText(url);
      flash('Link copied');
    } catch {
      /* user cancelled */
    }
  };

  const remove = async () => {
    setMenu(false);
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await apiFetch(`/api/community/feed/posts/${post.id}`, { method: 'DELETE' });
      onRemove(post.id);
    } catch (err) {
      flash((err as { message?: string })?.message || 'Could not delete the post.');
    }
  };

  const report = async (reason: string) => {
    setReporting(false);
    try {
      await apiFetch(`/api/community/posts/${post.id}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.toUpperCase().replace(/[^A-Z]+/g, '_'), description: reason }),
      });
      flash('Thanks — our team will review this post.');
    } catch {
      flash('Could not send the report.');
    }
  };

  const syncComments = (rows: FeedComment[]) => {
    setComments(rows);
    onChange({ ...post, commentCount: rows.length });
  };

  return (
    <article className={`${styles.card} ${styles.post}`}>
      <header className={styles.postHead}>
        <span className={styles.avatar} style={{ background: tone(post.author.name) }}>{initials(post.author.name)}</span>
        <div className={styles.postWho}>
          <div className={styles.postName}>
            <strong>{post.author.name}</strong>
            <AuthorBadge author={post.author} />
          </div>
          <div className={styles.postMeta}>
            <Link href={`/community/post/${post.id}`}>{timeAgo(post.createdAt)}</Link>
            {post.communityName && (
              <>
                <span aria-hidden>·</span>
                <Link href={`/community?c=${post.communityId}`}>
                  <i className="fa-solid fa-location-dot" aria-hidden /> {post.communityName}
                </Link>
              </>
            )}
            {post.type !== 'POST' && (
              <span className={`${styles.typeTag} ${post.type === 'REVIEW' ? styles.typeReview : styles.typeQuestion}`}>
                {post.type === 'REVIEW' ? 'Review' : 'Question'}
              </span>
            )}
          </div>
        </div>
        <div className={styles.menuWrap}>
          <button type="button" className={styles.iconBtn} onClick={() => setMenu((v) => !v)} aria-label="Post options" aria-expanded={menu}>
            <i className="fa-solid fa-ellipsis" />
          </button>
          {menu && (
            <>
              <button type="button" className={styles.menuScrim} aria-label="Close menu" onClick={() => setMenu(false)} />
              <div className={styles.menu} role="menu">
                <button type="button" role="menuitem" onClick={() => { setMenu(false); void share(); }}>
                  <i className="fa-solid fa-link" /> Copy link
                </button>
                {mine ? (
                  <button type="button" role="menuitem" className={styles.menuDanger} onClick={() => void remove()}>
                    <i className="fa-solid fa-trash-can" /> Delete post
                  </button>
                ) : (
                  isAuthenticated && (
                    <button type="button" role="menuitem" onClick={() => { setMenu(false); setReporting(true); }}>
                      <i className="fa-solid fa-flag" /> Report post
                    </button>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {post.type === 'REVIEW' && post.subject && (
        <Link href={`/b/${post.subject.slug}`} target="_blank" className={styles.reviewSubject}>
          <span className={styles.miniAvatar} style={{ background: tone(post.subject.name) }}>{initials(post.subject.name)}</span>
          <span className={styles.reviewSubjectText}>
            <strong>
              {post.subject.name}
              {post.subject.verified && <i className="fa-solid fa-circle-check" aria-label="Verified" />}
            </strong>
            <em>{post.subject.kind === 'provider' ? 'Independent provider' : 'Business'}</em>
          </span>
          {post.rating ? <Stars value={post.rating} /> : null}
          <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden />
        </Link>
      )}

      {post.title && <h3 className={styles.postTitle}>{post.title}</h3>}
      {post.body && (
        <div className={`${styles.postBody} ${clamped ? styles.postBodyClamp : ''}`}>
          <RichText text={post.body} mentions={post.mentions} />
        </div>
      )}
      {clamped && (
        <button type="button" className={styles.moreBtn} onClick={() => setClamped(false)}>See more</button>
      )}

      <MediaGrid media={post.media} onOpen={(i) => setLightbox(images.indexOf(post.media[i]))} />

      {(post.likeCount > 0 || post.commentCount > 0) && (
        <div className={styles.postCounts}>
          {post.likeCount > 0 && (
            <span><i className="fa-solid fa-heart" aria-hidden /> {post.likeCount}</span>
          )}
          {post.commentCount > 0 && (
            <button type="button" onClick={() => void toggleThread()}>
              {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
            </button>
          )}
        </div>
      )}

      <div className={styles.postActions}>
        <button type="button" onClick={() => void like()} className={post.likedByMe ? styles.liked : ''} aria-pressed={post.likedByMe}>
          <i className={`fa-${post.likedByMe ? 'solid' : 'regular'} fa-heart`} /> {post.type === 'QUESTION' ? 'Helpful' : 'Like'}
        </button>
        <button type="button" onClick={() => void toggleThread()} aria-expanded={showThread}>
          <i className="fa-regular fa-comment" /> {post.type === 'QUESTION' ? 'Answer' : 'Comment'}
        </button>
        <button type="button" onClick={() => void share()}>
          <i className="fa-solid fa-share" /> Share
        </button>
      </div>

      {showThread && (
        <div className={styles.threadWrap}>
          {loadingThread || comments === null ? (
            <div className={styles.threadLoading}><span className="spinner" /></div>
          ) : (
            <Thread postId={post.id} comments={comments} onChange={syncComments} autoFocus={!expanded} />
          )}
        </div>
      )}

      {notice && <div className={styles.toast} role="status">{notice}</div>}

      {reporting && (
        <div className={styles.reportBox}>
          <strong>Why are you reporting this post?</strong>
          <div className={styles.reportOptions}>
            {REPORT_REASONS.map((r) => (
              <button key={r} type="button" onClick={() => void report(r)}>{r}</button>
            ))}
          </div>
          <button type="button" className={styles.linkBtn} onClick={() => setReporting(false)}>Cancel</button>
        </div>
      )}

      {lightbox !== null && images[lightbox] && (
        <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label="Photo" onClick={() => setLightbox(null)}>
          <button type="button" className={styles.lightboxClose} aria-label="Close"><i className="fa-solid fa-xmark" /></button>
          {images.length > 1 && (
            <button
              type="button"
              className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
              aria-label="Previous photo"
              onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + images.length) % images.length); }}
            >
              <i className="fa-solid fa-chevron-left" />
            </button>
          )}
          <img src={images[lightbox].url} alt="" onClick={(e) => e.stopPropagation()} />
          {images.length > 1 && (
            <button
              type="button"
              className={`${styles.lightboxNav} ${styles.lightboxNext}`}
              aria-label="Next photo"
              onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % images.length); }}
            >
              <i className="fa-solid fa-chevron-right" />
            </button>
          )}
        </div>
      )}
    </article>
  );
}

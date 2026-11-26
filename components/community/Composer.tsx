'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { loginHref } from '@/lib/auth-redirect';
import MentionInput, { MentionInputHandle } from './MentionInput';
import type { CommunityInfo, FeedPost, MediaItem, Mention, Mentionable } from './types';
import { encodeMentions, initials, tone } from './types';
import styles from '@/app/community/community.module.css';

import Dropdown from '@/components/ui/Dropdown';
type Mode = 'POST' | 'REVIEW' | 'QUESTION';
type Upload = MediaItem & { key: string; uploading?: boolean; error?: string; preview: string };

const MODES: { id: Mode; label: string; icon: string; hint: string }[] = [
  { id: 'POST', label: 'Post', icon: 'fa-pen', hint: 'Share an update, a tip or a recommendation…' },
  { id: 'REVIEW', label: 'Review', icon: 'fa-star', hint: 'How was your experience? What stood out?' },
  { id: 'QUESTION', label: 'Ask', icon: 'fa-circle-question', hint: 'Ask the community — e.g. “Who does a good deep clean in DHA?”' },
];

export default function Composer({
  communities,
  defaultCommunityId,
  onPosted,
}: {
  communities: CommunityInfo[];
  defaultCommunityId?: number | null;
  onPosted: (post: FeedPost) => void;
}) {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('POST');
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState<Mention[]>([]);
  const [media, setMedia] = useState<Upload[]>([]);
  const [communityId, setCommunityId] = useState<number | ''>(defaultCommunityId ?? '');
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [subject, setSubject] = useState<Mentionable | null>(null);
  const [subjectQuery, setSubjectQuery] = useState('');
  const [subjectResults, setSubjectResults] = useState<Mentionable[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<MentionInputHandle>(null);

  useEffect(() => {
    if (mode !== 'REVIEW' || subject) return;
    const id = window.setTimeout(() => {
      apiFetch<Mentionable[]>(`/api/community/mentions?q=${encodeURIComponent(subjectQuery)}`, { skipAuth: true })
        .then(setSubjectResults)
        .catch(() => setSubjectResults([]));
    }, 160);
    return () => window.clearTimeout(id);
  }, [mode, subject, subjectQuery]);

  if (!isAuthenticated || !user) {
    return (
      <div className={`${styles.card} ${styles.guestComposer}`}>
        <div>
          <strong>Join the conversation</strong>
          <p>Sign in to post photos and videos, review businesses, ask questions and reply to others.</p>
        </div>
        <Link href={loginHref('/community')} className="btn btn-primary">
          Sign in to post
        </Link>
      </div>
    );
  }

  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'You';
  const uploading = media.some((m) => m.uploading);
  const canSend =
    !busy &&
    !uploading &&
    (text.trim().length > 0 || media.length > 0) &&
    (mode !== 'REVIEW' || (subject && rating > 0));

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    setError(null);
    const room = 6 - media.length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    if (files.length > room) setError('You can attach up to 6 photos or videos.');
    for (const file of list) {
      const isVideo = file.type.startsWith('video/');
      const key = `${file.name}-${file.size}-${Math.random()}`;
      const limit = isVideo ? 50 : 10;
      if (file.size > limit * 1024 * 1024) {
        setError(`${file.name} is larger than ${limit} MB.`);
        continue;
      }
      const preview = URL.createObjectURL(file);
      setMedia((prev) => [...prev, { key, url: '', type: isVideo ? 'video' : 'image', uploading: true, preview }]);
      const form = new FormData();
      form.append('file', file);
      try {
        const res = await apiFetch<{ url: string; type: 'image' | 'video' }>('/api/community/media', { method: 'POST', body: form });
        setMedia((prev) => prev.map((m) => (m.key === key ? { ...m, url: res.url, type: res.type, uploading: false } : m)));
      } catch (err) {
        setMedia((prev) => prev.filter((m) => m.key !== key));
        setError((err as { message?: string })?.message || `Could not upload ${file.name}.`);
      }
    }
  };

  const reset = () => {
    media.forEach((m) => URL.revokeObjectURL(m.preview));
    setText('');
    setTitle('');
    setPicked([]);
    setMedia([]);
    setRating(0);
    setSubject(null);
    setSubjectQuery('');
    setOpen(false);
    setMode('POST');
  };

  const submit = async () => {
    if (!canSend) return;
    setBusy(true);
    setError(null);
    try {
      const post = await apiFetch<{ post: FeedPost }>('/api/community/feed/posts', {
        method: 'POST',
        body: JSON.stringify({
          type: mode,
          communityId: communityId === '' ? null : communityId,
          title: mode === 'QUESTION' ? title : null,
          body: encodeMentions(text, picked),
          rating: mode === 'REVIEW' ? rating : null,
          businessId: mode === 'REVIEW' ? subject?.id : null,
          media: media.map(({ url, type }) => ({ url, type })),
        }),
      });
      onPosted(post.post);
      reset();
    } catch (err) {
      setError((err as { message?: string })?.message || 'Could not publish your post.');
    } finally {
      setBusy(false);
    }
  };

  const current = MODES.find((m) => m.id === mode)!;

  if (!open) {
    return (
      <div className={`${styles.card} ${styles.composerIdle}`}>
        <span className={styles.avatar} style={{ background: tone(name) }}>{initials(name)}</span>
        <button type="button" className={styles.composerFake} onClick={() => setOpen(true)}>
          What do you want to share, {user.firstName || 'friend'}?
        </button>
        <div className={styles.composerQuick}>
          <button type="button" onClick={() => { setOpen(true); window.setTimeout(() => fileRef.current?.click(), 50); }} title="Photo or video">
            <i className="fa-solid fa-photo-film" style={{ color: '#059669' }} /> <span>Media</span>
          </button>
          <button type="button" onClick={() => { setMode('REVIEW'); setOpen(true); }} title="Write a review">
            <i className="fa-solid fa-star" style={{ color: '#f59e0b' }} /> <span>Review</span>
          </button>
          <button type="button" onClick={() => { setMode('QUESTION'); setOpen(true); }} title="Ask a question">
            <i className="fa-solid fa-circle-question" style={{ color: '#2563eb' }} /> <span>Ask</span>
          </button>
        </div>
        <input ref={fileRef} type="file" hidden multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={(e) => { void addFiles(e.target.files); e.target.value = ''; }} />
      </div>
    );
  }

  return (
    <div className={`${styles.card} ${styles.composer}`}>
      <div className={styles.composerHead}>
        <div className={styles.segmented} role="tablist" aria-label="Post type">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              className={mode === m.id ? styles.segOn : ''}
              onClick={() => setMode(m.id)}
            >
              <i className={`fa-solid ${m.icon}`} aria-hidden /> {m.label}
            </button>
          ))}
        </div>
        <button type="button" className={styles.iconBtn} onClick={reset} aria-label="Close composer">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      {mode === 'REVIEW' && (
        <div className={styles.reviewBox}>
          {subject ? (
            <div className={styles.subjectChip}>
              <span className={styles.miniAvatar} style={{ background: tone(subject.name) }}>{initials(subject.name)}</span>
              <span>
                <strong>{subject.name}</strong>
                <em>{subject.kind === 'provider' ? 'Independent provider' : 'Business'}{subject.city ? ` · ${subject.city}` : ''}</em>
              </span>
              <button type="button" className={styles.iconBtn} onClick={() => setSubject(null)} aria-label="Change business">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          ) : (
            <div className={styles.subjectPicker}>
              <label htmlFor="review-subject">Who are you reviewing?</label>
              <div className={styles.searchField}>
                <i className="fa-solid fa-magnifying-glass" aria-hidden />
                <input
                  id="review-subject"
                  value={subjectQuery}
                  onChange={(e) => setSubjectQuery(e.target.value)}
                  placeholder="Search businesses and providers"
                  autoComplete="off"
                />
              </div>
              {subjectResults.length > 0 && (
                <ul className={styles.subjectList}>
                  {subjectResults.slice(0, 5).map((r) => (
                    <li key={r.id}>
                      <button type="button" onClick={() => setSubject(r)}>
                        <span className={styles.miniAvatar} style={{ background: tone(r.name) }}>{initials(r.name)}</span>
                        <span>
                          <strong>{r.name}</strong>
                          <em>{r.kind === 'provider' ? 'Independent provider' : 'Business'}{r.city ? ` · ${r.city}` : ''}</em>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className={styles.starPick} onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
                className={(hover || rating) >= n ? styles.starOn : ''}
              >
                <i className="fa-solid fa-star" />
              </button>
            ))}
            <span>{['Tap to rate', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][hover || rating]}</span>
          </div>
        </div>
      )}

      {mode === 'QUESTION' && (
        <input
          className={styles.titleInput}
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Your question in one line"
        />
      )}

      <MentionInput
        ref={inputRef}
        value={text}
        onChange={setText}
        picked={picked}
        onPick={(m) => setPicked((p) => [...p, m])}
        placeholder={`${current.hint}  Type @ to mention a business or provider.`}
        rows={4}
        autoFocus
        onSubmitShortcut={() => void submit()}
      />

      {media.length > 0 && (
        <div className={styles.uploadGrid}>
          {media.map((m) => (
            <div key={m.key} className={styles.uploadThumb}>
              {m.type === 'video' ? <video src={m.preview} muted /> : <img src={m.preview} alt="" />}
              {m.type === 'video' && <i className={`fa-solid fa-play ${styles.thumbPlay}`} aria-hidden />}
              {m.uploading && <span className={styles.thumbBusy}><span className="spinner" /></span>}
              <button
                type="button"
                className={styles.thumbRemove}
                aria-label="Remove"
                onClick={() => {
                  URL.revokeObjectURL(m.preview);
                  setMedia((prev) => prev.filter((x) => x.key !== m.key));
                }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className={styles.formError}><i className="fa-solid fa-circle-exclamation" /> {error}</p>}

      <div className={styles.composerFoot}>
        <div className={styles.composerTools}>
          <button type="button" onClick={() => fileRef.current?.click()} title="Add photos or videos" disabled={media.length >= 6}>
            <i className="fa-solid fa-photo-film" style={{ color: '#059669' }} /> <span>Photo / video</span>
          </button>
          <button type="button" onClick={() => { setText((t) => (t && !/\s$/.test(t) ? `${t} @` : `${t}@`)); inputRef.current?.focus(); }} title="Mention a business or provider">
            <i className="fa-solid fa-at" style={{ color: '#2563eb' }} /> <span>Mention</span>
          </button>
          <div style={{ minWidth: 170 }}>
            <Dropdown aria-label="Post to" value={String(communityId)} icon="fa-users" align="right"
              onChange={(v) => setCommunityId(v ? Number(v) : '')}
              options={[{ value: '', label: 'Everyone' }, ...communities.map((c) => ({ value: String(c.id), label: c.name }))]} />
          </div>
        </div>
        <button type="button" className="btn btn-primary" disabled={!canSend} onClick={() => void submit()}>
          {busy ? <span className="spinner" /> : uploading ? 'Uploading…' : mode === 'REVIEW' ? 'Publish review' : mode === 'QUESTION' ? 'Ask' : 'Post'}
        </button>
      </div>
      <input ref={fileRef} type="file" hidden multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={(e) => { void addFiles(e.target.files); e.target.value = ''; }} />
    </div>
  );
}

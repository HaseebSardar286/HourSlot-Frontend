'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { loginHref } from '@/lib/auth-redirect';
import MentionInput from './MentionInput';
import RichText from './RichText';
import type { Author, FeedComment, Mention } from './types';
import { encodeMentions, initials, timeAgo, tone } from './types';
import styles from '@/app/community/community.module.css';

export function AuthorBadge({ author }: { author: Author }) {
  if (author.kind === 'member') return null;
  return (
    <Link href={`/b/${author.businessSlug}`} target="_blank" className={styles.authorBadge}>
      <i className={`fa-solid ${author.kind === 'provider' ? 'fa-user-tie' : 'fa-store'}`} aria-hidden />
      {author.businessName}
      {author.verified && <i className="fa-solid fa-circle-check" aria-label="Verified" />}
    </Link>
  );
}

function ReplyBox({
  postId,
  parentId,
  prefill,
  onDone,
  autoFocus,
  compact,
}: {
  postId: number;
  parentId?: number;
  prefill?: Mention;
  onDone: (comments: FeedComment[]) => void;
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const [text, setText] = useState(prefill ? `@${prefill.name} ` : '');
  const [picked, setPicked] = useState<Mention[]>(prefill ? [prefill] : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'You';

  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const rows = await apiFetch<FeedComment[]>(`/api/community/feed/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: encodeMentions(text, picked), parentId: parentId ?? null }),
      });
      setText('');
      setPicked([]);
      onDone(rows);
    } catch (err) {
      setError((err as { message?: string })?.message || 'Could not send your reply.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${styles.replyBox} ${compact ? styles.replyBoxCompact : ''}`}>
      <span className={styles.avatarSm} style={{ background: tone(name) }}>{initials(name)}</span>
      <div className={styles.replyField}>
        <MentionInput
          value={text}
          onChange={setText}
          picked={picked}
          onPick={(m) => setPicked((p) => [...p, m])}
          rows={1}
          maxLength={2000}
          autoFocus={autoFocus}
          placeholder={parentId ? 'Write a reply…  (@ to mention)' : 'Add a comment…  (@ to mention a business)'}
          onSubmitShortcut={() => void send()}
        />
        {error && <p className={styles.formError}>{error}</p>}
      </div>
      <button type="button" className={styles.sendBtn} disabled={!text.trim() || busy} onClick={() => void send()} aria-label="Send">
        {busy ? <span className="spinner" /> : <i className="fa-solid fa-paper-plane" />}
      </button>
    </div>
  );
}

export default function Thread({
  postId,
  comments,
  onChange,
  autoFocus,
}: {
  postId: number;
  comments: FeedComment[];
  onChange: (comments: FeedComment[]) => void;
  autoFocus?: boolean;
}) {
  const { user, isAuthenticated } = useAuth();
  const [replyTo, setReplyTo] = useState<{ parent: number; author?: Author } | null>(null);
  const top = comments.filter((c) => !c.parentId);
  const childrenOf = (id: number) => comments.filter((c) => c.parentId === id);

  const remove = async (id: number) => {
    if (!window.confirm('Delete this reply?')) return;
    try {
      await apiFetch(`/api/community/feed/comments/${id}`, { method: 'DELETE' });
      onChange(comments.filter((c) => c.id !== id && c.parentId !== id));
    } catch {
      /* keep list as is */
    }
  };

  const renderComment = (c: FeedComment, child = false) => (
    <div key={c.id} className={`${styles.comment} ${child ? styles.commentChild : ''}`}>
      <span className={child ? styles.avatarXs : styles.avatarSm} style={{ background: tone(c.author.name) }}>
        {initials(c.author.name)}
      </span>
      <div className={styles.commentMain}>
        <div className={styles.commentBubble}>
          <div className={styles.commentHead}>
            <strong>{c.author.name}</strong>
            <AuthorBadge author={c.author} />
          </div>
          <p><RichText text={c.body} mentions={c.mentions} /></p>
        </div>
        <div className={styles.commentMeta}>
          <span>{timeAgo(c.createdAt)}</span>
          {isAuthenticated && (
            <button type="button" onClick={() => setReplyTo({ parent: c.parentId ?? c.id, author: c.author })}>
              Reply
            </button>
          )}
          {user && Number(user.id) === c.author.id && (
            <button type="button" onClick={() => void remove(c.id)}>Delete</button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.thread}>
      {top.map((c) => (
        <div key={c.id}>
          {renderComment(c)}
          <div className={styles.childList}>
            {childrenOf(c.id).map((r) => renderComment(r, true))}
            {replyTo?.parent === c.id && (
              <ReplyBox
                postId={postId}
                parentId={c.id}
                compact
                autoFocus
                onDone={(rows) => {
                  onChange(rows);
                  setReplyTo(null);
                }}
              />
            )}
          </div>
        </div>
      ))}
      {isAuthenticated ? (
        <ReplyBox postId={postId} onDone={onChange} autoFocus={autoFocus} />
      ) : (
        <p className={styles.signInHint}>
          <Link href={loginHref(`/community/post/${postId}`)}>Sign in</Link> to comment and reply.
        </p>
      )}
    </div>
  );
}

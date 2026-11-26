'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import PostCard from '@/components/community/PostCard';
import type { FeedComment, FeedPost } from '@/components/community/types';
import styles from '../../community.module.css';

export default function CommunityPostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ post: FeedPost; comments: FeedComment[] }>(`/api/community/feed/posts/${id}`)
      .then((res) => {
        setPost(res.post);
        setComments(res.comments);
      })
      .catch((err) => setError(err?.message || 'This post is no longer available.'));
  }, [id]);

  return (
    <div className={styles.single}>
      <Link href="/community" className={styles.backRow}>
        <i className="fa-solid fa-arrow-left" aria-hidden /> Community feed
      </Link>
      {error ? (
        <div className={`${styles.card} ${styles.empty}`}>
          <span className={styles.emptyIcon}><i className="fa-solid fa-comment-slash" /></span>
          <h3>Post not found</h3>
          <p>{error}</p>
        </div>
      ) : !post ? (
        <div className={`${styles.card} ${styles.threadLoading}`}><span className="spinner" /></div>
      ) : (
        <PostCard
          post={post}
          expanded
          initialComments={comments}
          onChange={setPost}
          onRemove={() => router.push('/community')}
        />
      )}
    </div>
  );
}

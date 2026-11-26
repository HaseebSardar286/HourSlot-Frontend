'use client';

import Link from 'next/link';
import { Fragment } from 'react';
import type { Mention } from './types';
import styles from '@/app/community/community.module.css';

const TOKEN = /@\[([^\]]{1,120})\]\(b:(\d{1,18})\)|(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g;

/** Renders post/reply text: mention tokens become profile links, bare URLs become links. */
export default function RichText({ text, mentions }: { text: string; mentions: Mention[] }) {
  const byId = new Map(mentions.map((m) => [String(m.id), m]));
  const parts: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(TOKEN)) {
    const at = match.index ?? 0;
    if (at > last) parts.push(<Fragment key={key++}>{text.slice(last, at)}</Fragment>);
    if (match[3]) {
      parts.push(
        <a key={key++} href={match[3]} target="_blank" rel="noopener noreferrer nofollow" className={styles.inlineLink}>
          {match[3].replace(/^https?:\/\//, '')}
        </a>
      );
    } else {
      const m = byId.get(match[2]);
      parts.push(
        m ? (
          <Link
            key={key++}
            href={`/b/${m.slug}`}
            target="_blank"
            className={styles.mention}
            title={m.kind === 'provider' ? 'Independent provider' : 'Business'}
          >
            @{m.name}
          </Link>
        ) : (
          <span key={key++} className={styles.mentionGone}>@{match[1]}</span>
        )
      );
    }
    last = at + match[0].length;
  }
  if (last < text.length) parts.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  return <>{parts}</>;
}

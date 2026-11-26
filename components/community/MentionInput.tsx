'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { Mention, Mentionable } from './types';
import { initials, tone } from './types';
import styles from '@/app/community/community.module.css';

type Props = {
  value: string;
  onChange: (value: string) => void;
  picked: Mention[];
  onPick: (m: Mention) => void;
  placeholder?: string;
  rows?: number;
  autoFocus?: boolean;
  maxLength?: number;
  onSubmitShortcut?: () => void;
};

export type MentionInputHandle = { focus: () => void; insertMention: (m: Mention) => void };

/**
 * Textarea with "@" autocomplete for businesses and providers. The text keeps a readable "@Name";
 * the picked list is turned into server tokens when the post is sent (see encodeMentions).
 */
const MentionInput = forwardRef<MentionInputHandle, Props>(function MentionInput(
  { value, onChange, picked, onPick, placeholder, rows = 3, autoFocus, maxLength = 5000, onSubmitShortcut },
  ref
) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [anchor, setAnchor] = useState(0);
  const [results, setResults] = useState<Mentionable[]>([]);
  const [active, setActive] = useState(0);

  const insert = (m: Mention, start: number, end: number) => {
    const next = `${value.slice(0, start)}@${m.name} ${value.slice(end)}`;
    onChange(next);
    if (!picked.some((p) => p.id === m.id)) onPick(m);
    setQuery(null);
    requestAnimationFrame(() => {
      const pos = start + m.name.length + 2;
      area.current?.focus();
      area.current?.setSelectionRange(pos, pos);
    });
  };

  useImperativeHandle(ref, () => ({
    focus: () => area.current?.focus(),
    insertMention: (m) => {
      const pos = area.current?.selectionStart ?? value.length;
      const pad = pos > 0 && !/\s$/.test(value.slice(0, pos)) ? ' ' : '';
      const next = `${value.slice(0, pos)}${pad}@${m.name} ${value.slice(pos)}`;
      onChange(next);
      if (!picked.some((p) => p.id === m.id)) onPick(m);
    },
  }));

  useEffect(() => {
    if (query === null) return;
    const id = window.setTimeout(() => {
      apiFetch<Mentionable[]>(`/api/community/mentions?q=${encodeURIComponent(query)}`, { skipAuth: true })
        .then((rows) => {
          setResults(rows);
          setActive(0);
        })
        .catch(() => setResults([]));
    }, 160);
    return () => window.clearTimeout(id);
  }, [query]);

  const detect = (text: string, caret: number) => {
    const before = text.slice(0, caret);
    const m = before.match(/(^|\s)@([^\s@]{0,30}(?: [^\s@]{0,30})?)$/);
    if (m) {
      setQuery(m[2]);
      setAnchor(caret - m[2].length - 1);
    } else {
      setQuery(null);
    }
  };

  const open = query !== null && results.length > 0;

  return (
    <div className={styles.mentionWrap}>
      <textarea
        ref={area}
        className={styles.textarea}
        value={value}
        rows={rows}
        maxLength={maxLength}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          detect(e.target.value, e.target.selectionStart);
        }}
        onClick={(e) => detect(value, e.currentTarget.selectionStart)}
        onBlur={() => window.setTimeout(() => setQuery(null), 150)}
        onKeyDown={(e) => {
          if (open) {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => (a + 1) % results.length);
              return;
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => (a - 1 + results.length) % results.length);
              return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault();
              const r = results[active];
              insert({ id: r.id, name: r.name, slug: r.slug, kind: r.kind }, anchor, e.currentTarget.selectionStart);
              return;
            }
            if (e.key === 'Escape') {
              setQuery(null);
              return;
            }
          }
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onSubmitShortcut) {
            e.preventDefault();
            onSubmitShortcut();
          }
        }}
      />
      {open && (
        <ul className={styles.mentionMenu} role="listbox" aria-label="Mention a business or provider">
          {results.map((r, i) => (
            <li key={r.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                className={`${styles.mentionOption} ${i === active ? styles.mentionOptionOn : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insert({ id: r.id, name: r.name, slug: r.slug, kind: r.kind }, anchor, area.current?.selectionStart ?? value.length);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <span className={styles.miniAvatar} style={{ background: tone(r.name) }}>
                  {initials(r.name)}
                </span>
                <span className={styles.mentionText}>
                  <strong>
                    {r.name}
                    {r.verified && <i className="fa-solid fa-circle-check" aria-label="Verified" />}
                  </strong>
                  <em>
                    {r.kind === 'provider' ? 'Independent provider' : 'Business'}
                    {r.category ? ` · ${r.category.replaceAll('_', ' ').toLowerCase()}` : ''}
                    {r.city ? ` · ${r.city}` : ''}
                  </em>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default MentionInput;

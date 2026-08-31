'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import styles from './ui.module.css';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface NotificationListResponse {
  notifications?: NotificationItem[];
  unreadCount?: number;
}

const POLL_MS = 60_000;
const MAX_BACKOFF_MS = 5 * 60_000;

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const failStreak = useRef(0);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<NotificationListResponse | NotificationItem[]>('/api/notifications');
      const list = Array.isArray(data) ? data : data?.notifications ?? [];
      setItems(list);
      if (!Array.isArray(data) && typeof data?.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      } else {
        setUnreadCount(list.filter((n) => !n.read).length);
      }
      failStreak.current = 0;
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUnread = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const data = await apiFetch<{ unreadCount: number }>('/api/notifications/unread-count');
      setUnreadCount(data?.unreadCount ?? 0);
      failStreak.current = 0;
    } catch {
      failStreak.current += 1;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (ms: number) => {
      timer = setTimeout(run, ms);
    };

    const run = async () => {
      if (cancelled) return;
      if (typeof document === 'undefined' || !document.hidden) {
        await loadUnread();
      }
      if (cancelled) return;
      const delay =
        failStreak.current === 0 ? POLL_MS : Math.min(POLL_MS * 2 ** failStreak.current, MAX_BACKOFF_MS);
      schedule(delay);
    };

    void run();
    const onVis = () => {
      if (!document.hidden) void loadUnread();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [loadUnread]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const markRead = async (id: number) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((n) => Math.max(0, n - 1));
    } catch {
      /* ignore */
    }
  };

  const markAll = async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'PUT' });
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const unread = unreadCount || items.filter((n) => !n.read).length;

  return (
    <div className={styles.notifWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.notifBtn}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void loadList();
        }}
      >
        <i className="fa-solid fa-bell" />
        {unread > 0 && <span className={styles.notifBadge}>{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className={styles.notifPanel}>
          <div className={styles.notifPanelHeader}>
            <h4>Notifications</h4>
            {unread > 0 && (
              <button type="button" className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={markAll}>
                Mark all read
              </button>
            )}
          </div>
          <div className={styles.notifList}>
            {loading && items.length === 0 && <div className={styles.notifEmpty}>Loading…</div>}
            {!loading && items.length === 0 && <div className={styles.notifEmpty}>You&apos;re all caught up.</div>}
            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`${styles.notifItem} ${!n.read ? styles.notifUnread : ''}`}
                onClick={() => !n.read && markRead(n.id)}
              >
                <div className={styles.notifItemTitle}>{n.title}</div>
                <div className={styles.notifItemBody}>{n.message}</div>
                <div className={styles.notifItemTime}>{formatTime(n.createdAt)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

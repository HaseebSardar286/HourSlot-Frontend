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

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const unread = items.filter((n) => !n.read).length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<NotificationItem[]>('/api/notifications');
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

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
    } catch {
      /* ignore */
    }
  };

  const markAll = async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'PUT' });
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
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

  return (
    <div className={styles.notifWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.notifBtn}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
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

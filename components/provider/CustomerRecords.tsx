'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useOrgLocale } from '@/lib/org-locale-context';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';

import Dropdown from '@/components/ui/Dropdown';
type Row = {
  customer_id: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  booking_count: number;
  completed_count: number;
  no_show_count: number;
  total_spent: number;
  last_visit_at?: string | null;
  next_booking_at?: string | null;
  tags: string[];
};

type Detail = {
  customer: { customer_id: number; email?: string; first_name?: string; last_name?: string; phone_number?: string };
  bookings: { id: number; booking_time: string; status: string; total_price: number; service_name?: string }[];
  notes: { id: number; note: string; created_at: string; author_first_name?: string }[];
  tags: string[];
};

const nameOf = (c: { first_name?: string; last_name?: string; email?: string }) =>
  `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || 'Customer';

const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** The provider's customer list with history, spend, private notes and tags. */
export default function CustomerRecords() {
  const { format } = useOrgLocale();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [note, setNote] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await apiFetch<Row[]>('/api/provider-tools/customers'));
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Failed to load customers.');
      setRows([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const open = async (id: number) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    try {
      const d = await apiFetch<Detail>(`/api/provider-tools/customers/${id}`);
      setDetail(d);
      setTagInput(d.tags.join(', '));
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Could not load this customer.');
    }
  };

  const act = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Something went wrong.');
    }
  };

  const addNote = (e: FormEvent) => {
    e.preventDefault();
    if (!openId || !note.trim()) return;
    void act(async () => {
      setDetail(await apiFetch<Detail>(`/api/provider-tools/customers/${openId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note }),
      }));
      setNote('');
    });
  };

  const saveTags = () => {
    if (!openId) return;
    const tags = tagInput.split(',').map((t) => t.trim()).filter(Boolean);
    void act(async () => {
      const res = await apiFetch<{ tags: string[] }>(`/api/provider-tools/customers/${openId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ tags }),
      });
      setDetail((d) => (d ? { ...d, tags: res.tags } : d));
      await load();
    });
  };

  const allTags = useMemo(() => Array.from(new Set((rows || []).flatMap((r) => r.tags))).sort(), [rows]);
  const visible = (rows || []).filter((r) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || [nameOf(r), r.email, r.phone_number].some((v) => v?.toLowerCase().includes(q));
    return matchesQuery && (!tagFilter || r.tags.includes(tagFilter));
  });

  if (rows === null) return <Skeleton variant="card" height={180} />;
  if (rows.length === 0) {
    return <EmptyState icon="fa-users" title="No customers yet" description="Customers appear after their first booking with you." />;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {error && <div className="error-alert">{error}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input className="form-input" style={{ flex: '1 1 220px' }} placeholder="Search name, email or phone"
          value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search customers" />
        {allTags.length > 0 && (
          <div style={{ flex: '0 1 200px' }}>
            <Dropdown aria-label="Filter by tag" value={tagFilter} onChange={setTagFilter} icon="fa-tag"
              options={[{ value: '', label: 'All tags' }, ...allTags.map((t) => ({ value: t, label: t }))]} />
          </div>
        )}
      </div>

      <DataTable<Row>
        rows={visible}
        rowKey={(r) => r.customer_id}
        onRowClick={(r) => void open(r.customer_id)}
        emptyMessage="No customers match."
        defaultSort={{ key: 'last', dir: 'desc' }}
        columns={[
          {
            key: 'name', header: 'Customer', sortValue: (r) => nameOf(r),
            render: (r) => (
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <strong>{nameOf(r)}</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.phone_number || r.email || '—'}</span>
              </div>
            ),
          },
          {
            key: 'tags', header: 'Tags', hideOnMobile: true,
            render: (r) => r.tags.length ? (
              <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {r.tags.map((t) => (
                  <span key={t} style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: 5, background: '#eef4ff', color: '#1d4ed8' }}>{t}</span>
                ))}
              </span>
            ) : <span style={{ color: 'var(--text-muted)' }}>—</span>,
          },
          { key: 'visits', header: 'Visits', align: 'right', sortValue: (r) => r.completed_count, render: (r) => r.completed_count },
          {
            key: 'noshow', header: 'No-shows', align: 'right', hideOnMobile: true, sortValue: (r) => r.no_show_count,
            render: (r) => <span style={{ color: r.no_show_count > 0 ? '#b91c1c' : undefined }}>{r.no_show_count}</span>,
          },
          { key: 'spent', header: 'Total spent', align: 'right', sortValue: (r) => Number(r.total_spent || 0), render: (r) => <strong>{format(r.total_spent)}</strong> },
          { key: 'last', header: 'Last visit', align: 'right', sortValue: (r) => (r.last_visit_at ? new Date(r.last_visit_at).getTime() : null), render: (r) => fmtDate(r.last_visit_at) },
          { key: 'next', header: 'Next booking', align: 'right', hideOnMobile: true, sortValue: (r) => (r.next_booking_at ? new Date(r.next_booking_at).getTime() : null), render: (r) => fmtDate(r.next_booking_at) },
        ]}
      />

      <Modal open={openId !== null} title={openId !== null ? nameOf((rows || []).find((x) => x.customer_id === openId) || {}) : ''} onClose={() => setOpenId(null)} wide>
        {openId !== null && (
          detail === null ? <Skeleton variant="row" count={3} /> : (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input className="form-input" style={{ flex: '1 1 220px' }} value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)} placeholder="Tags, comma-separated (e.g. VIP, Has dog)"
                  aria-label="Tags" />
                <button type="button" className="btn btn-outline btn-sm" onClick={saveTags}>Save tags</button>
                {detail.customer.phone_number && (
                  <a className="btn btn-outline btn-sm" target="_blank" rel="noreferrer"
                    href={`https://wa.me/${detail.customer.phone_number.replace(/\D/g, '')}`}>
                    <i className="fa-brands fa-whatsapp" /> WhatsApp
                  </a>
                )}
              </div>

              <form onSubmit={addNote} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input className="form-input" style={{ flex: '1 1 260px' }} value={note} maxLength={2000}
                  onChange={(e) => setNote(e.target.value)} placeholder="Private note (only you can see it)"
                  aria-label="New note" />
                <button type="submit" className="btn btn-primary btn-sm" disabled={!note.trim()}>Add note</button>
              </form>
              {detail.notes.map((n) => (
                <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.9rem' }}>
                  <span>{n.note} <span style={{ color: 'var(--text-muted)' }}>· {fmtDate(n.created_at)}</span></span>
                  <button type="button" className="btn btn-ghost btn-sm" aria-label="Delete note"
                    onClick={() => void act(async () => {
                      await apiFetch(`/api/provider-tools/customers/${openId}/notes/${n.id}`, { method: 'DELETE' });
                      setDetail((d) => (d ? { ...d, notes: d.notes.filter((x) => x.id !== n.id) } : d));
                    })}>
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
              ))}

              <div style={{ display: 'grid', gap: 4 }}>
                <strong style={{ fontSize: '0.85rem' }}>History</strong>
                {detail.bookings.map((b) => (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.85rem', flexWrap: 'wrap' }}>
                    <span>{fmtDate(b.booking_time)} · {b.service_name || 'Service'}</span>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {format(b.total_price)} <StatusBadge status={b.status} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </Modal>
    </div>
  );
}

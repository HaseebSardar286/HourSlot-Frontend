'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  SUPPORT_CATEGORY, SUPPORT_STATUS, dateLabel,
  type SupportCategory, type SupportStatus, type SupportTicket,
} from '@/lib/payments';
import Dropdown from '@/components/ui/Dropdown';
import s from '@/components/workspace/tools.module.css';

const TONE = { amber: s.chipAmber, blue: s.chipBlue, green: s.chipGreen, slate: s.chipSlate } as const;
const CATEGORIES = Object.keys(SUPPORT_CATEGORY) as SupportCategory[];
type AdminFilter = 'ACTIVE' | SupportStatus | '';

function errText(e: unknown, fallback: string) {
  return (e as { message?: string })?.message || fallback;
}

function Inner({ admin }: { admin: boolean }) {
  const params = useSearchParams();
  const base = admin ? '/api/admin/support/tickets' : '/api/support/tickets';

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [counts, setCounts] = useState<{ open: number; waiting: number; high: number } | null>(null);
  const [filter, setFilter] = useState<AdminFilter>('ACTIVE');
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [composing, setComposing] = useState(params.get('new') === '1');
  const [draft, setDraft] = useState({
    category: (params.get('category') as SupportCategory) || 'OTHER',
    subject: params.get('subject') || '',
    message: '',
  });
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      if (admin) {
        const r = await apiFetch<{ tickets: SupportTicket[]; counts: { open: number; waiting: number; high: number } }>(
          `${base}${filter ? `?status=${filter}` : ''}`);
        setTickets(r.tickets);
        setCounts(r.counts);
      } else {
        setTickets(await apiFetch<SupportTicket[]>(base));
      }
      setError(null);
    } catch (e) {
      setError(errText(e, 'Could not load tickets.'));
    } finally {
      setLoading(false);
    }
  }, [admin, base, filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on filter change
    void load();
  }, [load]);

  async function open(t: SupportTicket) {
    setComposing(false);
    try {
      setSelected(await apiFetch<SupportTicket>(`${base}/${t.id}`));
      setReply('');
    } catch (e) {
      setError(errText(e, 'Could not open the ticket.'));
    }
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const bookingId = Number(params.get('bookingId')) || undefined;
      const t = await apiFetch<SupportTicket>(base, {
        method: 'POST',
        body: JSON.stringify({ ...draft, relatedType: bookingId ? 'BOOKING' : undefined, relatedId: bookingId }),
      });
      setComposing(false);
      setDraft({ category: 'OTHER', subject: '', message: '' });
      setSelected(t);
      await load();
    } catch (e) {
      setError(errText(e, 'Could not open the ticket.'));
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!selected) return;
    setBusy(true);
    try {
      setSelected(await apiFetch<SupportTicket>(`${base}/${selected.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: reply }),
      }));
      setReply('');
      await load();
    } catch (e) {
      setError(errText(e, 'Could not send the message.'));
    } finally {
      setBusy(false);
    }
  }

  async function update(body: { status?: SupportStatus; priority?: string }) {
    if (!selected) return;
    setBusy(true);
    try {
      setSelected(await apiFetch<SupportTicket>(`${base}/${selected.id}`, { method: 'PATCH', body: JSON.stringify(body) }));
      await load();
    } catch (e) {
      setError(errText(e, 'Could not update the ticket.'));
    } finally {
      setBusy(false);
    }
  }

  const st = selected ? SUPPORT_STATUS[selected.status] : null;

  return (
    <div className={s.page}>
      <header className={s.head}>
        <div>
          <h1>{admin ? 'Support tickets' : 'Help & support'}</h1>
          <p>
            {admin
              ? 'Questions and problems from customers, businesses and providers. Urgent and payment tickets sort to the top.'
              : 'Ask the Duemet team about a booking, a payment, your plan or your account. We reply here and notify you.'}
          </p>
        </div>
        {!admin && (
          <div className={s.headActions}>
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => { setComposing(true); setSelected(null); }}>
              <i className="fa-solid fa-plus" /> New ticket
            </button>
          </div>
        )}
      </header>

      {admin && counts && (
        <div className={`${s.stats} ${s.stats3}`}>
          <div className={s.stat}>
            <span className={`${s.iconTile} ${s.toneAmber}`}><i className="fa-solid fa-inbox" /></span>
            <div className={s.statText}><div className={s.statLabel}>Waiting for us</div><div className={s.statValue}>{counts.open}</div></div>
          </div>
          <div className={s.stat}>
            <span className={s.iconTile}><i className="fa-solid fa-reply" /></span>
            <div className={s.statText}><div className={s.statLabel}>Waiting for the user</div><div className={s.statValue}>{counts.waiting}</div></div>
          </div>
          <div className={s.stat}>
            <span className={`${s.iconTile} ${s.toneRose}`}><i className="fa-solid fa-triangle-exclamation" /></span>
            <div className={s.statText}><div className={s.statLabel}>High priority open</div><div className={s.statValue}>{counts.high}</div></div>
          </div>
        </div>
      )}

      {error && <div className={`${s.alert} ${s.alertErr}`} role="alert"><i className="fa-solid fa-circle-exclamation" /> {error}</div>}

      <div className={s.split}>
        <section className={s.panel}>
          {admin && (
            <div className={s.toolbar}>
              <div className={s.tabs} role="tablist" aria-label="Filter tickets">
                {(['ACTIVE', 'OPEN', 'WAITING_ON_USER', 'RESOLVED', 'CLOSED', ''] as AdminFilter[]).map((f) => (
                  <button key={f || 'all'} type="button" role="tab" aria-selected={filter === f}
                    className={filter === f ? s.tabOn : ''} onClick={() => setFilter(f)}>
                    {f === 'ACTIVE' ? 'Active' : f === '' ? 'All' : SUPPORT_STATUS[f].label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {loading ? (
            <div className={s.panelBody}>{[0, 1, 2].map((i) => <div key={i} className={s.skel} style={{ height: 52 }} />)}</div>
          ) : tickets.length === 0 ? (
            <div className={s.empty} style={{ padding: '40px 20px' }}>
              <i className="fa-solid fa-life-ring" />
              <strong>No tickets</strong>
              {admin ? 'Nothing in this view.' : 'When you need help, open a ticket and the Duemet team will reply here.'}
            </div>
          ) : (
            <div className={s.list}>
              {tickets.map((t) => {
                const ts = SUPPORT_STATUS[t.status];
                return (
                  <button key={t.id} type="button" className={s.row} onClick={() => open(t)}
                    style={{ width: '100%', textAlign: 'left', background: selected?.id === t.id ? 'var(--bg-secondary, #eef3fd)' : undefined, border: 0, cursor: 'pointer' }}>
                    <span className={`${s.iconTile} ${t.priority === 'HIGH' || t.priority === 'URGENT' ? s.toneRose : ''}`}>
                      <i className="fa-solid fa-life-ring" />
                    </span>
                    <div className={s.rowMain}>
                      <div className={s.rowTitle}>{t.subject}</div>
                      <div className={s.rowMeta}>
                        {t.ticketNumber} · {SUPPORT_CATEGORY[t.category]}
                        {admin ? ` · ${t.userName || t.userEmail}${t.businessName ? ` (${t.businessName})` : ''}` : ''}
                        {' · '}{dateLabel(t.lastMessageAt, true)}
                      </div>
                    </div>
                    <span className={`${s.chip} ${TONE[ts.tone]}`}>{admin && t.status === 'OPEN' ? 'Needs reply' : ts.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className={s.panel}>
          {composing && !admin ? (
            <>
              <div className={s.panelHead}><div className={s.panelHeadText}><h2>New ticket</h2><p>Tell us what happened. Include booking codes or invoice numbers if you have them.</p></div></div>
              <div className={s.panelBody}>
                <div className={s.stack}>
                  <label className={s.field}>
                    <span className={s.label}>Topic</span>
                    <Dropdown id="ticket-category" aria-label="Topic" value={draft.category}
                      onChange={(v) => setDraft({ ...draft, category: v as SupportCategory })}
                      options={CATEGORIES.map((c) => ({ value: c, label: SUPPORT_CATEGORY[c] }))} />

                  </label>
                  <label className={s.field}>
                    <span className={s.label}>Subject</span>
                    <input id="ticket-subject" className={s.input} value={draft.subject} maxLength={200}
                      onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
                  </label>
                  <label className={s.field}>
                    <span className={s.label}>Message</span>
                    <textarea id="ticket-message" className={s.textarea} rows={6} value={draft.message}
                      onChange={(e) => setDraft({ ...draft, message: e.target.value })} />
                  </label>
                </div>
              </div>
              <div className={s.panelFoot}>
                <div className={s.btnRow}>
                  <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => setComposing(false)}>Cancel</button>
                  <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={busy || !draft.subject.trim() || !draft.message.trim()} onClick={create}>
                    Send to support
                  </button>
                </div>
              </div>
            </>
          ) : selected && st ? (
            <>
              <div className={s.panelHead}>
                <div className={s.panelHeadText}>
                  <h2>{selected.subject}</h2>
                  <p>
                    {selected.ticketNumber} · {SUPPORT_CATEGORY[selected.category]} · opened {dateLabel(selected.createdAt)}
                    {admin ? ` · ${selected.userName} (${selected.userEmail})` : ''}
                  </p>
                </div>
                <span className={`${s.chip} ${TONE[st.tone]}`}>{st.label}</span>
              </div>
              <div className={s.panelBody}>
                <div className={s.stack}>
                  {(selected.messages || []).map((m) => (
                    <div key={m.id} style={{
                      padding: '12px 14px', borderRadius: 5, maxWidth: '88%',
                      justifySelf: m.fromStaff === admin ? 'end' : 'start',
                      background: m.fromStaff ? '#eef3fd' : '#f6f8fb', border: '1px solid #e1e7f0',
                    }}>
                      <div className={s.hint} style={{ marginBottom: 4 }}>{m.authorName} · {dateLabel(m.createdAt, true)}</div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
                    </div>
                  ))}
                </div>
              </div>
              {selected.status !== 'CLOSED' || admin ? (
                <div className={s.panelFoot}>
                  <div className={s.stack} style={{ width: '100%' }}>
                    <textarea id="ticket-reply" className={s.textarea} rows={3} value={reply} onChange={(e) => setReply(e.target.value)}
                      placeholder={admin ? 'Reply to the user' : 'Add more detail or reply'} />
                    <div className={s.btnRow} style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <div className={s.btnRow}>
                        {admin ? (
                          <>
                            <Dropdown id="ticket-priority" aria-label="Priority" value={selected.priority} icon="fa-flag"
                              onChange={(v) => update({ priority: v })}
                              options={['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((p) => ({ value: p, label: `${p.charAt(0) + p.slice(1).toLowerCase()} priority` }))} />

                            <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} disabled={busy} onClick={() => update({ status: 'RESOLVED' })}>Mark resolved</button>
                            <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} disabled={busy} onClick={() => update({ status: 'CLOSED' })}>Close</button>
                          </>
                        ) : selected.status === 'RESOLVED' ? (
                          <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} disabled={busy} onClick={() => update({ status: 'OPEN' })}>Reopen</button>
                        ) : (
                          <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} disabled={busy} onClick={() => update({ status: 'RESOLVED' })}>My problem is solved</button>
                        )}
                      </div>
                      <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={busy || !reply.trim()} onClick={send}>Send</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={s.panelFoot}><span className={s.hint}>This ticket is closed. Open a new one if you still need help.</span></div>
              )}
            </>
          ) : (
            <div className={s.empty} style={{ padding: '60px 20px' }}>
              <i className="fa-regular fa-comments" />
              <strong>{admin ? 'Pick a ticket' : 'Pick a ticket or open a new one'}</strong>
              The conversation shows here.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function SupportCenter({ admin = false }: { admin?: boolean }) {
  return <Suspense fallback={null}><Inner admin={admin} /></Suspense>;
}

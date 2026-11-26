'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { fetchWorkspaceSlug, type Workspace } from '@/lib/workspace-api';
import Dropdown, { Switch } from '@/components/ui/Dropdown';
import DatePicker from '@/components/ui/DatePicker';
import TicketQr from '@/components/payments/TicketQr';
import {
  addDays, avatarColor, dayLabel, dur, errMsg, hm, initials, money,
  type Board, type DeskSettings, type Me, type QueueEntry, type Visit,
} from '@/lib/ops';
import Dialog from './Dialog';
import StaffTimeline from './StaffTimeline';
import WalkInDialog from './WalkInDialog';
import s from './ops.module.css';

type Modal =
  | { kind: 'walkin' }
  | { kind: 'code' }
  | { kind: 'settings' }
  | { kind: 'qr' }
  | { kind: 'visit'; visit: Visit }
  | { kind: 'finish'; visit: Visit }
  | { kind: 'reassign'; visit: Visit }
  | { kind: 'alert'; visit: Visit }
  | { kind: 'seat'; entry: QueueEntry }
  | null;

/** The day at the desk: every booking and walk-in on one board, from arrival to done. */
export default function FrontDesk({ workspace }: { workspace: Workspace }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [date, setDate] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [slug, setSlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (date) qs.set('date', date);
    if (branchId) qs.set('branchId', branchId);
    try {
      const b = await apiFetch<Board>(`/api/front-desk/board?${qs}`);
      setBoard(b);
      setError(null);
    } catch (e) {
      setError(errMsg(e, 'Could not load the front desk.'));
    }
  }, [date, branchId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 20000);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    apiFetch<Me>('/api/front-desk/me').then(setMe).catch(() => setMe(null));
    void fetchWorkspaceSlug(workspace).then(setSlug);
  }, [workspace]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const act = async (id: number, fn: () => Promise<unknown>, msg?: string) => {
    setBusy(id);
    setError(null);
    try {
      await fn();
      if (msg) setNotice(msg);
      setModal(null);
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const visitAction = (v: Visit, action: string, body?: object, msg?: string) =>
    act(v.id, () => apiFetch(`/api/front-desk/visits/${v.id}/${action}`, { method: 'POST', body: JSON.stringify(body || {}) }), msg);

  const q = query.trim().toLowerCase();
  const match = useCallback((...vals: (string | null | undefined)[]) =>
    !q || vals.some((x) => (x || '').toLowerCase().includes(q)), [q]);

  const cols = useMemo(() => {
    const vs = (board?.visits || []).filter((v) => match(v.customerName, v.phone, v.code, v.serviceName, v.staffName));
    return {
      expected: vs.filter((v) => v.stage === 'EXPECTED'),
      here: vs.filter((v) => v.stage === 'ARRIVED' || v.stage === 'IN_SERVICE')
        .sort((a, b) => (a.stage === b.stage ? a.start.localeCompare(b.start) : a.stage === 'IN_SERVICE' ? -1 : 1)),
      done: vs.filter((v) => v.stage === 'DONE' || v.stage === 'NO_SHOW' || v.stage === 'CANCELLED').reverse(),
      queue: (board?.queue || []).filter((e) => match(e.customer_name, e.phone, String(e.ticket_number), e.service_name)),
    };
  }, [board, match]);

  if (!board) {
    return (
      <div className={s.page}>
        {error ? <div className={s.err}><i className="fa-solid fa-circle-exclamation" /> {error}</div>
          : <div className={s.panel} style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>}
      </div>
    );
  }

  const st = board.stats;
  const today = board.now.slice(0, 10);
  const cur = board.visits.find((v) => v.currency)?.currency || board.services[0]?.currency || 'PKR';
  const kpis = [
    { label: 'Still to come', value: st.expected, icon: 'fa-calendar-day', tone: s.tBlue, sub: st.late ? `${st.late} running late` : st.unconfirmed ? `${st.unconfirmed} not confirmed` : 'all on time' },
    { label: 'Here now', value: st.arrived + st.inService, icon: 'fa-user-check', tone: s.tAmber, sub: `${st.inService} in service` },
    { label: 'Walk-ins waiting', value: st.walkInsWaiting, icon: 'fa-people-line', tone: s.tViolet, sub: `${st.walkInsToday} walk-ins today` },
    { label: 'Finished', value: st.done, icon: 'fa-circle-check', tone: s.tGreen, sub: money(st.revenue, cur) },
    { label: 'No-shows', value: st.noShows, icon: 'fa-user-xmark', tone: st.noShows ? s.tRed : s.tSlate, sub: `${st.cancelled} cancelled` },
    { label: 'Team on today', value: `${st.staffWorking}/${st.staffTotal}`, icon: 'fa-user-group', tone: s.tSlate, sub: board.lanes.filter((l) => l.state === 'FREE').length + ' free now' },
  ];

  return (
    <div className={s.page}>
      <section className={s.hero}>
        <div className={s.heroTop}>
          <div>
            <div className={s.eyebrow}>{board.isToday && <span className={s.live} />} Front desk · {dayLabel(board.date, today)}</div>
            <h1>{board.isToday ? "Today's customers" : `Customers on ${dayLabel(board.date)}`}</h1>
            <p>Online bookings and walk-ins together. Check people in, seat walk-ins in the next free gap, and finish visits.</p>
          </div>
          <div className={s.heroActions}>
            {board.isToday && <span className={s.clock}>{hm(board.now)}</span>}
            <button type="button" className={s.glassBtn} onClick={() => setModal({ kind: 'code' })}><i className="fa-solid fa-qrcode" /> Check in by code</button>
            {board.isToday && (
              <button type="button" className={s.whiteBtn} onClick={() => setModal({ kind: 'walkin' })}><i className="fa-solid fa-user-plus" /> Add walk-in</button>
            )}
          </div>
        </div>
        <div className={s.heroBar}>
          <div className={s.dayNav}>
            <button type="button" className={s.glassBtn} aria-label="Previous day" onClick={() => setDate(addDays(board.date, -1))}><i className="fa-solid fa-chevron-left" /></button>
            <div style={{ width: 230 }}>
              <DatePicker value={board.date} onChange={(d) => setDate(d || today)} aria-label="Day" />
            </div>
            <button type="button" className={s.glassBtn} aria-label="Next day" onClick={() => setDate(addDays(board.date, 1))}><i className="fa-solid fa-chevron-right" /></button>
            {!board.isToday && <button type="button" className={s.glassBtn} onClick={() => setDate('')}>Today</button>}
          </div>
          {board.branches.length > 1 && (
            <div style={{ width: 220 }}>
              <Dropdown icon="fa-location-dot" aria-label="Branch" value={branchId} onChange={setBranchId}
                options={[{ value: '', label: 'All branches' }, ...board.branches.map((b) => ({ value: String(b.id), label: b.name }))]} />
            </div>
          )}
          <label className={s.search}>
            <i className="fa-solid fa-magnifying-glass" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find by name, phone or code" aria-label="Search customers" />
          </label>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {slug && <button type="button" className={s.glassBtn} onClick={() => setModal({ kind: 'qr' })}><i className="fa-solid fa-mobile-screen" /> Queue QR</button>}
            {slug && <a className={s.glassBtn} href={`/q/${encodeURIComponent(slug)}`} target="_blank" rel="noreferrer"><i className="fa-solid fa-tv" /> Queue screen</a>}
            {me?.owner && <button type="button" className={s.glassBtn} onClick={() => setModal({ kind: 'settings' })} aria-label="Front desk settings"><i className="fa-solid fa-gear" /></button>}
          </div>
        </div>
      </section>

      {error && <div className={s.err} role="alert"><i className="fa-solid fa-circle-exclamation" /> {error}</div>}
      {notice && <div className={s.ok} role="status"><i className="fa-solid fa-circle-check" /> {notice}</div>}

      <div className={s.kpis}>
        {kpis.map((k) => (
          <div key={k.label} className={s.kpi}>
            <span className={`${s.kpiIcon} ${k.tone}`}><i className={`fa-solid ${k.icon}`} /></span>
            <div style={{ minWidth: 0 }}>
              <div className={s.kpiLabel}>{k.label}</div>
              <div className={s.kpiValue}>{k.value}</div>
              <div className={s.kpiSub}>{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <section className={s.panel}>
        <div className={s.panelHead}>
          <div>
            <h2><i className="fa-solid fa-chart-gantt" style={{ color: '#2563eb' }} /> Team today</h2>
            <p>Who is free, who is busy and where walk-ins will fit. Click a booking to open it.</p>
          </div>
          <div className={s.legend}>
            <span><i className={s.sw} style={{ background: '#dbe7fd' }} /> Booked</span>
            <span><i className={s.sw} style={{ background: '#ffe8b5' }} /> Arrived</span>
            <span><i className={s.sw} style={{ background: '#6d4ae0' }} /> In service</span>
            <span><i className={s.sw} style={{ background: '#cdeedb' }} /> Done</span>
            <span><i className={s.sw} style={{ border: '1.5px dashed #a996ef' }} /> Walk-in (planned)</span>
            <span><i className={s.sw} style={{ background: '#fbe9c9' }} /> Break</span>
          </div>
        </div>
        {board.lanes.length === 0 ? (
          <div className={s.empty}><i className="fa-solid fa-user-plus" /> Add your team under Staff to see their day here.</div>
        ) : (
          <StaffTimeline lanes={board.lanes} visits={board.visits} queue={board.queue} now={board.now} isToday={board.isToday}
            onOpen={(v) => setModal({ kind: 'visit', visit: v })} />
        )}
      </section>

      <div className={s.board}>
        <Column title="Walk-in queue" dot="#6d4ae0" count={cols.queue.length}
          action={board.isToday ? <button type="button" className={`${s.btn} ${s.iconOnly}`} aria-label="Add walk-in" onClick={() => setModal({ kind: 'walkin' })}><i className="fa-solid fa-plus" /></button> : null}>
          {!board.isToday ? <Empty icon="fa-clock-rotate-left" text="The queue is for today only." />
            : cols.queue.length === 0 ? <Empty icon="fa-mug-hot" text="Nobody waiting. Walk-ins you add appear here with their wait time." />
              : cols.queue.map((e) => (
                <QueueCard key={e.id} e={e} busy={busy === e.id}
                  onSeat={() => setModal({ kind: 'seat', entry: e })}
                  onLeft={() => act(e.id, () => apiFetch(`/api/front-desk/walk-ins/${e.id}/left`, { method: 'POST' }), `${e.customer_name} removed from the queue.`)} />
              ))}
        </Column>
        <Column title="Coming up" dot="#2563eb" count={cols.expected.length}>
          {cols.expected.length === 0 ? <Empty icon="fa-calendar-check" text={q ? 'No match.' : 'Nobody else is booked.'} />
            : cols.expected.map((v) => (
              <VisitCard key={v.id} v={v} busy={busy === v.id} isToday={board.isToday} graceMin={board.settings.lateGraceMinutes}
                onOpen={() => setModal({ kind: 'visit', visit: v })}
                onCheckIn={() => visitAction(v, 'check-in', {}, `${v.customerName} checked in.`)}
                onStart={() => visitAction(v, 'start', {}, `${v.customerName} started.`)}
                onNoShow={() => visitAction(v, 'no-show', {}, `${v.customerName} marked as a no-show.`)} />
            ))}
        </Column>
        <Column title="Here now" dot="#b76e00" count={cols.here.length}>
          {cols.here.length === 0 ? <Empty icon="fa-couch" text="Checked-in customers and visits in progress show here." />
            : cols.here.map((v) => (
              <VisitCard key={v.id} v={v} busy={busy === v.id} isToday={board.isToday} graceMin={board.settings.lateGraceMinutes}
                onOpen={() => setModal({ kind: 'visit', visit: v })}
                onStart={() => visitAction(v, 'start', {}, `${v.customerName} started.`)}
                onFinish={() => setModal({ kind: 'finish', visit: v })} />
            ))}
        </Column>
        <Column title="Finished" dot="#0f9d58" count={cols.done.length}>
          {cols.done.length === 0 ? <Empty icon="fa-flag-checkered" text="Finished visits, no-shows and cancellations." />
            : cols.done.map((v) => (
              <VisitCard key={v.id} v={v} busy={busy === v.id} isToday={board.isToday} graceMin={board.settings.lateGraceMinutes}
                onOpen={() => setModal({ kind: 'visit', visit: v })} />
            ))}
        </Column>
      </div>

      {modal?.kind === 'walkin' && (
        <WalkInDialog board={board} onClose={() => setModal(null)} onDone={(m) => { setModal(null); setNotice(m); void load(); }} />
      )}
      {modal?.kind === 'seat' && (
        <SeatDialog entry={modal.entry} board={board} onClose={() => setModal(null)}
          onSeat={(staffId, serviceId) => act(modal.entry.id, () => apiFetch(`/api/front-desk/walk-ins/${modal.entry.id}/seat`, {
            method: 'POST', body: JSON.stringify({ staffId, serviceId }),
          }), `${modal.entry.customer_name} is seated.`)} />
      )}
      {modal?.kind === 'code' && (
        <CodeDialog onClose={() => setModal(null)} onDone={(m) => { setModal(null); setNotice(m); void load(); }} />
      )}
      {modal?.kind === 'finish' && (
        <FinishDialog visit={modal.visit} currency={cur} busy={busy === modal.visit.id} onClose={() => setModal(null)}
          onFinish={(tip) => visitAction(modal.visit, 'complete', { tip }, `${modal.visit.customerName}'s visit is finished.`)} />
      )}
      {modal?.kind === 'reassign' && (
        <ReassignDialog visit={modal.visit} board={board} onClose={() => setModal(null)}
          onSave={(staffId) => visitAction(modal.visit, 'reassign', { staffId }, `Moved to ${board.lanes.find((l) => l.staffId === staffId)?.name}.`)} />
      )}
      {modal?.kind === 'alert' && modal.visit.customerId && (
        <AlertDialog visit={modal.visit} onSaved={() => { setModal(null); void load(); }} />
      )}
      {modal?.kind === 'visit' && (
        <VisitDialog v={modal.visit} board={board} bookingsHref={`/${workspace}/bookings`} onClose={() => setModal(null)} busy={busy === modal.visit.id}
          onAction={(a) => {
            if (a === 'finish') setModal({ kind: 'finish', visit: modal.visit });
            else if (a === 'reassign') setModal({ kind: 'reassign', visit: modal.visit });
            else if (a === 'alert') setModal({ kind: 'alert', visit: modal.visit });
            else void visitAction(modal.visit, a, {}, 'Saved.');
          }} />
      )}
      {modal?.kind === 'settings' && (
        <SettingsDialog initial={board.settings} onClose={() => setModal(null)} onSaved={() => { setModal(null); setNotice('Front desk settings saved.'); void load(); }} />
      )}
      {modal?.kind === 'qr' && slug && (
        <Dialog title="Let walk-ins join from their phone" sub="Print this or show it at the door. People scan it, join the queue and see their wait." onClose={() => setModal(null)}>
          <div style={{ display: 'grid', justifyItems: 'center', gap: 12, padding: '8px 0 12px' }}>
            <TicketQr code={`${typeof window !== 'undefined' ? window.location.origin : ''}/q/${slug}/join`} size={220} />
            <code style={{ fontSize: '0.8rem', wordBreak: 'break-all', textAlign: 'center' }}>{`${typeof window !== 'undefined' ? window.location.origin : ''}/q/${slug}/join`}</code>
            {!board.settings.selfJoinQueue && <div className={s.err}>Joining from a phone is switched off in the front desk settings.</div>}
          </div>
        </Dialog>
      )}
    </div>
  );
}

function Column({ title, dot, count, action, children }: { title: string; dot: string; count: number; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={s.col} aria-label={title}>
      <div className={s.colHead}>
        <h3><span className={s.colDot} style={{ background: dot }} />{title} <span className={s.count}>{count}</span></h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ icon, text }: { icon: string; text: string }) {
  return <div className={s.empty}><i className={`fa-solid ${icon}`} />{text}</div>;
}

function Tags({ v }: { v: Visit }) {
  return (
    <div className={s.tags}>
      {v.walkIn && <span className={`${s.tag} ${s.tagViolet}`}><i className="fa-solid fa-person-walking" /> Walk-in{v.ticket ? ` #${v.ticket}` : ''}</span>}
      {v.firstVisit && <span className={`${s.tag} ${s.tagBlue}`}><i className="fa-solid fa-star" /> First visit</span>}
      {!v.walkIn && !v.firstVisit && v.visits > 0 && <span className={s.tag}>{v.visits} visit{v.visits === 1 ? '' : 's'}</span>}
      {v.attendance === 'CONFIRMED' && <span className={`${s.tag} ${s.tagGreen}`}><i className="fa-solid fa-check" /> Confirmed</span>}
      {v.stage === 'EXPECTED' && !v.attendance && !v.walkIn && v.status === 'CONFIRMED' && <span className={s.tag}>Not confirmed</span>}
      {v.status === 'PENDING' && <span className={`${s.tag} ${s.tagAmber}`}>Awaiting approval</span>}
      {v.noShows > 0 && <span className={`${s.tag} ${s.tagRed}`}><i className="fa-solid fa-triangle-exclamation" /> {v.noShows} no-show{v.noShows > 1 ? 's' : ''}</span>}
      {v.late && <span className={`${s.tag} ${s.tagRed}`}>Late {dur(v.lateMinutes)}</span>}
      {v.stage === 'NO_SHOW' && <span className={`${s.tag} ${s.tagRed}`}>No-show</span>}
      {v.stage === 'CANCELLED' && <span className={s.tag}>Cancelled</span>}
      {v.stage === 'DONE' && v.paymentStatus && !v.paymentStatus.startsWith('PAID') && <span className={`${s.tag} ${s.tagAmber}`}>Unpaid</span>}
      {v.tip ? <span className={`${s.tag} ${s.tagGreen}`}>Tip {v.tip}</span> : null}
    </div>
  );
}

function VisitCard({
  v, busy, isToday, graceMin, onOpen, onCheckIn, onStart, onFinish, onNoShow,
}: {
  v: Visit; busy: boolean; isToday: boolean; graceMin: number; onOpen: () => void;
  onCheckIn?: () => void; onStart?: () => void; onFinish?: () => void; onNoShow?: () => void;
}) {
  const timeNote = v.stage === 'IN_SERVICE' ? `${dur(v.runningMinutes)} in`
    : v.stage === 'EXPECTED' && isToday && v.startsInMinutes != null ? (v.startsInMinutes === 0 ? 'now' : `in ${dur(v.startsInMinutes)}`) : '';
  return (
    <article className={`${s.card} ${v.late ? s.cardLate : ''}`}>
      <div className={s.cardTop}>
        <div style={{ minWidth: 0 }}>
          <div className={s.cardName}>{v.customerName}</div>
          <div className={s.cardMeta}><i className="fa-solid fa-scissors" /> {v.serviceName || 'Service'}</div>
          <div className={s.cardMeta}>
            <span className={s.avatar} style={{ width: 16, height: 16, borderRadius: 5, fontSize: 8, display: 'inline-grid', verticalAlign: -3, marginRight: 4, background: avatarColor(v.staffId || 0) }}>{initials(v.staffName)}</span>
            {v.staffName || 'Any staff'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className={s.cardTime}>{hm(v.start)}</div>
          {timeNote && <div className={s.cardMeta}>{timeNote}</div>}
        </div>
      </div>
      <Tags v={v} />
      {v.alerts && <div className={s.alertLine}><i className="fa-solid fa-circle-exclamation" /> {v.alerts}</div>}
      <div className={s.cardActions}>
        {onCheckIn && isToday && <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={busy} onClick={onCheckIn}><i className="fa-solid fa-right-to-bracket" /> Check in</button>}
        {onStart && (v.stage === 'ARRIVED' || (v.stage === 'EXPECTED' && isToday)) && (
          <button type="button" className={`${s.btn} ${v.stage === 'ARRIVED' ? s.btnViolet : ''}`} disabled={busy} onClick={onStart}><i className="fa-solid fa-play" /> Start</button>
        )}
        {onFinish && v.stage === 'IN_SERVICE' && <button type="button" className={`${s.btn} ${s.btnGreen}`} disabled={busy} onClick={onFinish}><i className="fa-solid fa-flag-checkered" /> Finish</button>}
        {onNoShow && v.late && <button type="button" className={`${s.btn} ${s.btnDanger}`} disabled={busy} onClick={onNoShow}>No-show</button>}
        <button type="button" className={`${s.btn} ${s.btnGhost} ${s.iconOnly}`} onClick={onOpen} style={{ marginLeft: 'auto' }}
          aria-label={`Details for ${v.customerName}`} title="Details"><i className="fa-solid fa-ellipsis" /></button>
      </div>
      {v.late && graceMin > 0 && <span className={s.muted} style={{ fontSize: '0.72rem' }}>More than {graceMin} min late</span>}
    </article>
  );
}

function QueueCard({ e, busy, onSeat, onLeft }: { e: QueueEntry; busy: boolean; onSeat: () => void; onLeft: () => void }) {
  const soon = (e.estimatedWaitMinutes ?? 99) <= 5;
  return (
    <article className={s.card}>
      <div className={s.cardTop}>
        <div style={{ display: 'flex', gap: 10, minWidth: 0 }}>
          <span className={s.avatar} style={{ background: '#6d4ae0' }}>#{e.ticket_number}</span>
          <div style={{ minWidth: 0 }}>
            <div className={s.cardName}>{e.customer_name}</div>
            <div className={s.cardMeta}>{e.service_name || 'Service not chosen'}{e.phone ? ` · ${e.phone}` : ''}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className={s.cardTime}>{dur(e.waitedMinutes)}</div>
          <div className={s.cardMeta}>waiting</div>
        </div>
      </div>
      <div className={s.tags}>
        {e.source === 'SELF' && <span className={`${s.tag} ${s.tagBlue}`}><i className="fa-solid fa-mobile-screen" /> Joined by phone</span>}
        {e.preferred_staff_name && <span className={s.tag}>Wants {e.preferred_staff_name}</span>}
        {e.estimatedStart ? (
          <span className={`${s.tag} ${soon ? s.tagGreen : s.tagAmber}`}>
            {soon ? `${e.suggestedStaffName} is free now` : `${e.suggestedStaffName} at ${hm(e.estimatedStart)} · ~${dur(e.estimatedWaitMinutes)}`}
          </span>
        ) : <span className={`${s.tag} ${s.tagRed}`}>No free time left today</span>}
      </div>
      {e.note && <div className={s.cardMeta}><i className="fa-regular fa-note-sticky" /> {e.note}</div>}
      <div className={s.cardActions}>
        <button type="button" className={`${s.btn} ${soon ? s.btnPrimary : ''}`} disabled={busy} onClick={onSeat}><i className="fa-solid fa-chair" /> Seat</button>
        <button type="button" className={`${s.btn} ${s.btnGhost}`} disabled={busy} onClick={onLeft} title="Left without being served">Left</button>
      </div>
    </article>
  );
}

function SeatDialog({ entry, board, onClose, onSeat }: { entry: QueueEntry; board: Board; onClose: () => void; onSeat: (staffId: number | null, serviceId: number | null) => void }) {
  const [serviceId, setServiceId] = useState(entry.service_id ? String(entry.service_id) : '');
  const [staffId, setStaffId] = useState(entry.suggestedStaffId ? String(entry.suggestedStaffId) : '');
  return (
    <Dialog title={`Seat #${entry.ticket_number} ${entry.customer_name}`} sub="Starts the visit now and blocks the time for online bookings." onClose={onClose}
      footer={(
        <>
          <button type="button" className={`${s.btn} ${s.btnLg}`} onClick={onClose}>Cancel</button>
          <button type="button" className={`${s.btn} ${s.btnLg} ${s.btnPrimary}`} disabled={!serviceId}
            onClick={() => onSeat(staffId ? Number(staffId) : null, serviceId ? Number(serviceId) : null)}><i className="fa-solid fa-chair" /> Seat now</button>
        </>
      )}>
      <div className={s.fields}>
        <div className={s.field}>
          <span className={s.label}>Service</span>
          <Dropdown aria-label="Service" value={serviceId} onChange={setServiceId} icon="fa-scissors" placeholder="Choose a service"
            options={board.services.map((sv) => ({ value: String(sv.id), label: sv.name, sublabel: `${sv.minutes} min` }))} />
        </div>
        <div className={s.field}>
          <span className={s.label}>With</span>
          <Dropdown aria-label="Staff" value={staffId} onChange={setStaffId} icon="fa-user"
            options={[{ value: '', label: 'Whoever is free', icon: 'fa-bolt' }, ...board.lanes.filter((l) => !l.off).map((l) => ({
              value: String(l.staffId), label: l.name,
              sublabel: l.state === 'FREE' ? 'Free now' : l.state === 'BUSY' ? `Busy until ${hm(l.busyUntil)}` : l.state === 'BREAK' ? 'On a break' : undefined,
            }))]} />
        </div>
      </div>
      {entry.estimatedStart && (entry.estimatedWaitMinutes ?? 0) > 5 && (
        <div className={s.muted} style={{ fontSize: '0.82rem' }}>
          The plan has {entry.suggestedStaffName} free at {hm(entry.estimatedStart)}. Seating now only works with someone who is free.
        </div>
      )}
    </Dialog>
  );
}

function CodeDialog({ onClose, onDone }: { onClose: () => void; onDone: (m: string) => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/front-desk/check-in-code', { method: 'POST', body: JSON.stringify({ code }) });
      onDone(`Booking ${code.toUpperCase()} checked in.`);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog title="Check in by booking code" sub="Type the code from the customer's booking ticket, or scan its QR with a scanner that types." onClose={onClose}
      footer={<button type="button" className={`${s.btn} ${s.btnLg} ${s.btnPrimary}`} disabled={busy || !code.trim()} onClick={submit}><i className="fa-solid fa-right-to-bracket" /> Check in</button>}>
      <input className={s.input} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. HS00000123" aria-label="Booking code"
        onKeyDown={(e) => { if (e.key === 'Enter' && code.trim()) void submit(); }} style={{ fontSize: '1.1rem', letterSpacing: '0.06em' }} />
      {error && <div className={s.err} role="alert">{error}</div>}
    </Dialog>
  );
}

function FinishDialog({ visit, currency, busy, onClose, onFinish }: { visit: Visit; currency: string; busy: boolean; onClose: () => void; onFinish: (tip: number | null) => void }) {
  const [tip, setTip] = useState('');
  return (
    <Dialog title={`Finish ${visit.customerName}'s visit`} sub={`${visit.serviceName || 'Service'} with ${visit.staffName || 'staff'} · ${money(visit.price, currency)}`} onClose={onClose}
      footer={(
        <>
          <button type="button" className={`${s.btn} ${s.btnLg}`} onClick={onClose}>Not yet</button>
          <button type="button" className={`${s.btn} ${s.btnLg} ${s.btnGreen}`} disabled={busy} onClick={() => onFinish(tip ? Number(tip) : null)}>
            <i className="fa-solid fa-flag-checkered" /> Finish visit
          </button>
        </>
      )}>
      <label className={s.field}>
        <span className={s.label}>Tip for {visit.staffName || 'the staff member'} <span className={s.hint}>(optional, counted in their pay)</span></span>
        <input className={s.input} type="number" min={0} inputMode="decimal" value={tip} onChange={(e) => setTip(e.target.value)} placeholder={`0 ${currency}`} />
      </label>
      <p className={s.muted} style={{ margin: 0, fontSize: '0.8rem' }}>Record the payment itself under Payments. Finishing early frees the rest of the slot.</p>
    </Dialog>
  );
}

function ReassignDialog({ visit, board, onClose, onSave }: { visit: Visit; board: Board; onClose: () => void; onSave: (staffId: number) => void }) {
  const [staffId, setStaffId] = useState('');
  return (
    <Dialog title="Move to someone else" sub={`${visit.customerName} · ${hm(visit.start)} – ${hm(visit.end)}`} onClose={onClose}
      footer={<button type="button" className={`${s.btn} ${s.btnLg} ${s.btnPrimary}`} disabled={!staffId} onClick={() => onSave(Number(staffId))}>Move booking</button>}>
      <Dropdown aria-label="Staff" value={staffId} onChange={setStaffId} icon="fa-user" placeholder="Choose a team member"
        options={board.lanes.filter((l) => l.staffId !== visit.staffId).map((l) => ({ value: String(l.staffId), label: l.name, sublabel: l.off ? l.offReason || 'Off' : undefined }))} />
      <p className={s.muted} style={{ margin: 0, fontSize: '0.8rem' }}>If they already have a booking at this time, the move is refused.</p>
    </Dialog>
  );
}

function AlertDialog({ visit, onSaved }: { visit: Visit; onSaved: () => void }) {
  const [items, setItems] = useState<{ id: number; note: string }[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    apiFetch<{ id: number; note: string }[]>(`/api/front-desk/customers/${visit.customerId}/alerts`).then(setItems).catch(() => setItems([]));
  }, [visit.customerId]);
  const add = async () => {
    try {
      setItems(await apiFetch(`/api/front-desk/customers/${visit.customerId}/alerts`, { method: 'POST', body: JSON.stringify({ note }) }));
      setNote('');
    } catch (e) { setError(errMsg(e)); }
  };
  const remove = async (id: number) => {
    await apiFetch(`/api/front-desk/alerts/${id}`, { method: 'DELETE' }).catch(() => null);
    setItems((x) => x.filter((i) => i.id !== id));
  };
  return (
    <Dialog title={`Alerts for ${visit.customerName}`} sub="Allergies, preferences or anything the team must know. Shown on every visit." onClose={onSaved}
      footer={<button type="button" className={`${s.btn} ${s.btnLg}`} onClick={onSaved}>Done</button>}>
      {items.map((i) => (
        <div key={i.id} className={s.alertLine} style={{ justifyContent: 'space-between' }}>
          <span><i className="fa-solid fa-circle-exclamation" /> {i.note}</span>
          <button type="button" className={`${s.btn} ${s.btnGhost} ${s.iconOnly}`} aria-label="Remove alert" onClick={() => remove(i.id)}><i className="fa-solid fa-trash" /></button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8 }}>
        <input className={s.input} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Allergic to latex" aria-label="New alert" />
        <button type="button" className={`${s.btn} ${s.btnLg} ${s.btnPrimary}`} disabled={!note.trim()} onClick={add}>Add</button>
      </div>
      {error && <div className={s.err}>{error}</div>}
    </Dialog>
  );
}

function VisitDialog({ v, board, busy, bookingsHref, onClose, onAction }: { v: Visit; board: Board; busy: boolean; bookingsHref: string; onClose: () => void; onAction: (a: string) => void }) {
  const open = v.stage === 'EXPECTED' || v.stage === 'ARRIVED' || v.stage === 'IN_SERVICE';
  const cur = v.currency || 'PKR';
  return (
    <Dialog title={v.customerName} sub={`${v.code} · ${hm(v.start)} – ${hm(v.end)} · ${dayLabel(board.date)}`} onClose={onClose} wide
      footer={(
        <>
          {v.customerId && <button type="button" className={`${s.btn} ${s.btnLg}`} onClick={() => onAction('alert')}><i className="fa-solid fa-circle-exclamation" /> Alerts</button>}
          {open && <button type="button" className={`${s.btn} ${s.btnLg}`} onClick={() => onAction('reassign')}><i className="fa-solid fa-right-left" /> Move</button>}
          {v.stage === 'ARRIVED' && <button type="button" className={`${s.btn} ${s.btnLg}`} disabled={busy} onClick={() => onAction('undo-check-in')}>Undo check-in</button>}
          {v.stage === 'EXPECTED' && board.isToday && <button type="button" className={`${s.btn} ${s.btnLg} ${s.btnPrimary}`} disabled={busy} onClick={() => onAction('check-in')}>Check in</button>}
          {(v.stage === 'EXPECTED' || v.stage === 'ARRIVED') && <button type="button" className={`${s.btn} ${s.btnLg} ${s.btnViolet}`} disabled={busy} onClick={() => onAction('start')}><i className="fa-solid fa-play" /> Start</button>}
          {v.stage === 'IN_SERVICE' && <button type="button" className={`${s.btn} ${s.btnLg} ${s.btnGreen}`} onClick={() => onAction('finish')}><i className="fa-solid fa-flag-checkered" /> Finish</button>}
        </>
      )}>
      <Tags v={v} />
      {v.alerts && <div className={s.alertLine}><i className="fa-solid fa-circle-exclamation" /> {v.alerts}</div>}
      <table className={s.table}>
        <tbody>
          <tr><td className={s.muted}>Service</td><td className={s.strong}>{v.serviceName}</td></tr>
          <tr><td className={s.muted}>With</td><td>{v.staffName || 'Any staff'}</td></tr>
          <tr><td className={s.muted}>Phone</td><td>{v.phone ? <a href={`tel:${v.phone}`}>{v.phone}</a> : '—'}</td></tr>
          <tr><td className={s.muted}>Price</td><td>{money(v.price, cur)} · {(v.paymentStatus || 'UNPAID').replace(/_/g, ' ').toLowerCase()}{v.paymentMethod ? ` (${v.paymentMethod.toLowerCase()})` : ''}</td></tr>
          <tr><td className={s.muted}>Customer</td><td>{v.walkIn ? 'Walk-in' : v.firstVisit ? 'First visit' : `${v.visits} earlier visits`}{v.noShows ? ` · ${v.noShows} no-shows` : ''}</td></tr>
          {v.notes && <tr><td className={s.muted}>Note</td><td>{v.notes}</td></tr>}
        </tbody>
      </table>
      {v.stage === 'EXPECTED' && v.late && (
        <button type="button" className={`${s.btn} ${s.btnDanger}`} style={{ justifySelf: 'start' }} disabled={busy} onClick={() => onAction('no-show')}>
          <i className="fa-solid fa-user-xmark" /> Mark as no-show
        </button>
      )}
      {!v.walkIn && <Link href={bookingsHref} className={s.muted} style={{ fontSize: '0.8rem' }}>Reschedule or cancel from Bookings</Link>}
    </Dialog>
  );
}

function SettingsDialog({ initial, onClose, onSaved }: { initial: DeskSettings; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<DeskSettings>(initial);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof DeskSettings>(k: K, val: DeskSettings[K]) => setV((x) => ({ ...x, [k]: val }));
  const save = async () => {
    try {
      await apiFetch('/api/front-desk/settings', { method: 'PUT', body: JSON.stringify(v) });
      onSaved();
    } catch (e) { setError(errMsg(e)); }
  };
  const row = (title: string, text: string, control: React.ReactNode) => (
    <div className={s.settingRow}><div><strong>{title}</strong><span>{text}</span></div>{control}</div>
  );
  return (
    <Dialog title="Front desk settings" sub="How lateness, reminders and the walk-in queue work at your business." onClose={onClose} wide
      footer={<button type="button" className={`${s.btn} ${s.btnLg} ${s.btnPrimary}`} onClick={save}>Save settings</button>}>
      <div className={s.settingsList}>
        {row('Grace period', 'Minutes after the start time before a booking shows as late.',
          <input className={`${s.input} ${s.numInput}`} type="number" min={0} max={120} value={v.lateGraceMinutes} aria-label="Grace minutes"
            onChange={(e) => set('lateGraceMinutes', Number(e.target.value))} />)}
        {row('Mark no-shows automatically', 'Bookings nobody checked in are marked as no-shows after the grace period, freeing the slot.',
          <Switch label="" checked={v.autoNoShow} onChange={(x) => set('autoNoShow', x)} />)}
        {row('Reminder a day before', 'Email and app notice about 24 hours ahead.',
          <Switch label="" checked={v.reminder24h} onChange={(x) => set('reminder24h', x)} />)}
        {row('Reminder 2 hours before', 'App notice shortly before the visit.',
          <Switch label="" checked={v.reminder2h} onChange={(x) => set('reminder2h', x)} />)}
        {row('Ask customers to confirm', 'Reminders include "I\'ll be there" and "I can\'t make it" buttons. Cancelling frees the slot.',
          <Switch label="" checked={v.askConfirmation} onChange={(x) => set('askConfirmation', x)} />)}
        {row('Walk-ins can join by phone', 'Customers scan your queue QR, join the queue and follow their wait.',
          <Switch label="" checked={v.selfJoinQueue} onChange={(x) => set('selfJoinQueue', x)} />)}
        {row('Late clock-in after', 'Minutes after a shift starts before a clock-in counts as late.',
          <input className={`${s.input} ${s.numInput}`} type="number" min={0} max={120} value={v.lateClockInMinutes} aria-label="Late clock-in minutes"
            onChange={(e) => set('lateClockInMinutes', Number(e.target.value))} />)}
      </div>
      <p className={s.muted} style={{ margin: 0, fontSize: '0.8rem' }}>Cancellation fees and pay-upfront rules for repeat no-shows are under Booking tools.</p>
      {error && <div className={s.err}>{error}</div>}
    </Dialog>
  );
}

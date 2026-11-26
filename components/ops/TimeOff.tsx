'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Dropdown from '@/components/ui/Dropdown';
import DatePicker from '@/components/ui/DatePicker';
import { addDays, avatarColor, dayLabel, errMsg, hm, initials, todayIso, type Me } from '@/lib/ops';
import Dialog from './Dialog';
import OpsHero, { Kpi, Notice } from './OpsHero';
import s from './ops.module.css';

type Leave = {
  id: number; staff_id: number; staff_name: string; start_at: string; end_at: string; kind: string; status: string;
  reason?: string; decision_note?: string; clashing_bookings: number;
};
type Swap = {
  id: number; from_staff_id: number; from_name: string; to_staff_id: number; to_name: string; shift_date: string;
  note?: string; status: string;
};
type Affected = { id: number; public_code: string; booking_time: string; customer_name: string }[];

const KIND = [
  { value: 'LEAVE', label: 'Annual leave', icon: 'fa-umbrella-beach' },
  { value: 'SICK', label: 'Sick', icon: 'fa-briefcase-medical' },
  { value: 'PERSONAL', label: 'Personal', icon: 'fa-house-user' },
  { value: 'OTHER', label: 'Other', icon: 'fa-ellipsis' },
];
const STATUS_TAG: Record<string, string> = { PENDING: s.tagAmber, APPROVED: s.tagGreen, REJECTED: s.tagRed, CANCELLED: '', ACCEPTED: s.tagBlue, DECLINED: s.tagRed };
const SWAP_LABEL: Record<string, string> = { PENDING: 'Waiting for colleague', ACCEPTED: 'Waiting for approval', APPROVED: 'Approved', DECLINED: 'Declined', REJECTED: 'Not approved', CANCELLED: 'Cancelled' };

const lastDay = (endAt: string) => addDays(endAt.slice(0, 10), endAt.slice(11, 16) === '00:00' ? -1 : 0);
const range = (l: Leave) => {
  const a = l.start_at.slice(0, 10);
  const b = lastDay(l.end_at);
  return a === b ? dayLabel(a) : `${dayLabel(a)} – ${dayLabel(b)}`;
};

/** Leave requests (staff ask, owner approves) and shift swaps (colleague accepts, owner approves). */
export default function TimeOff() {
  const [me, setMe] = useState<Me | null>(null);
  const [leave, setLeave] = useState<Leave[]>([]);
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [dialog, setDialog] = useState<'leave' | 'swap' | null>(null);
  const [affected, setAffected] = useState<{ title: string; items: Affected } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [l, w] = await Promise.all([apiFetch<Leave[]>('/api/staff-ops/leave'), apiFetch<Swap[]>('/api/staff-ops/swaps')]);
      setLeave(l);
      setSwaps(w);
    } catch (e) { setError(errMsg(e)); }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    apiFetch<Me>('/api/front-desk/me').then(setMe).catch(() => null);
  }, [load]);

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setError(null);
    try {
      const r = await fn();
      setOk(msg);
      const items = (r as { affected?: Affected; notMoved?: Affected })?.affected || (r as { notMoved?: Affected })?.notMoved;
      if (items && items.length) setAffected({ title: msg, items });
      void load();
    } catch (e) { setError(errMsg(e)); }
  };

  const owner = !!me?.owner;
  const pending = leave.filter((l) => l.status === 'PENDING');
  const swapsToMe = swaps.filter((w) => w.status === 'PENDING' && w.to_staff_id === me?.staffId);
  const swapsToApprove = swaps.filter((w) => owner && (w.status === 'ACCEPTED' || w.status === 'PENDING'));
  const today = todayIso();
  const offToday = leave.filter((l) => l.status === 'APPROVED' && l.start_at.slice(0, 10) <= today && lastDay(l.end_at) >= today);

  return (
    <div className={s.page}>
      <OpsHero eyebrow="Team · Time off" title="Time off & shift swaps"
        text={owner ? 'Approve leave and swaps. Approved time off blocks online bookings for that person automatically.'
          : 'Ask for time off or ask a colleague to cover a shift. You will be notified when it is decided.'}
        actions={(
          <>
            {me?.staffId && <button type="button" className={s.glassBtn} onClick={() => setDialog('swap')}><i className="fa-solid fa-right-left" /> Ask for a swap</button>}
            <button type="button" className={s.whiteBtn} onClick={() => setDialog('leave')}><i className="fa-solid fa-plane-departure" /> {owner ? 'Add time off' : 'Request time off'}</button>
          </>
        )} />

      <Notice error={error} ok={ok} />

      <div className={s.kpis}>
        <Kpi label="Waiting for a decision" value={pending.length + swapsToApprove.filter((w) => w.status === 'ACCEPTED').length} icon="fa-hourglass-half" tone={s.tAmber} sub="leave and swaps" />
        <Kpi label="Off today" value={offToday.length} icon="fa-user-clock" tone={s.tBlue} sub={offToday.map((l) => l.staff_name.split(' ')[0]).join(', ') || 'everyone in'} />
        <Kpi label="Upcoming approved" value={leave.filter((l) => l.status === 'APPROVED' && l.start_at.slice(0, 10) > today).length} icon="fa-calendar-check" tone={s.tGreen} />
        <Kpi label="Swaps this month" value={swaps.filter((w) => w.status === 'APPROVED' && w.shift_date.slice(0, 7) === today.slice(0, 7)).length} icon="fa-right-left" tone={s.tViolet} />
      </div>

      {swapsToMe.length > 0 && (
        <section className={s.panel}>
          <div className={s.panelHead}><div><h2><i className="fa-solid fa-hand" style={{ color: '#6d4ae0' }} /> Can you cover?</h2><p>Colleagues asking you to take their shift.</p></div></div>
          <div className={s.panelBody} style={{ display: 'grid', gap: 10 }}>
            {swapsToMe.map((w) => (
              <div key={w.id} className={s.card} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div className={s.cardName}>{w.from_name} · {dayLabel(w.shift_date)}</div>
                  {w.note && <div className={s.cardMeta}>{w.note}</div>}
                </div>
                <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => run(() => apiFetch(`/api/staff-ops/swaps/${w.id}/accept`, { method: 'POST' }), 'Swap accepted. It now needs manager approval.')}>Accept</button>
                <button type="button" className={s.btn} onClick={() => run(() => apiFetch(`/api/staff-ops/swaps/${w.id}/decline`, { method: 'POST' }), 'Swap declined.')}>Decline</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className={s.grid2}>
        <section className={s.panel}>
          <div className={s.panelHead}>
            <div><h2><i className="fa-solid fa-umbrella-beach" style={{ color: '#b76e00' }} /> Time off <span className={s.count}>{leave.length}</span></h2>
              <p>{owner ? 'Requests waiting for you are at the top.' : 'Your requests.'}</p></div>
          </div>
          <div className={s.panelBody} style={{ display: 'grid', gap: 10 }}>
            {leave.length === 0 && <div className={s.empty}><i className="fa-solid fa-mug-hot" /> No time off yet.</div>}
            {leave.map((l) => (
              <article key={l.id} className={s.card}>
                <div className={s.cardTop}>
                  <div style={{ display: 'flex', gap: 10, minWidth: 0 }}>
                    <span className={s.avatar} style={{ background: avatarColor(l.staff_id) }}>{initials(l.staff_name)}</span>
                    <div style={{ minWidth: 0 }}>
                      <div className={s.cardName}>{l.staff_name}</div>
                      <div className={s.cardMeta}>{KIND.find((k) => k.value === l.kind)?.label || l.kind} · {range(l)}</div>
                    </div>
                  </div>
                  <span className={`${s.tag} ${STATUS_TAG[l.status] || ''}`}>{l.status.toLowerCase()}</span>
                </div>
                {l.reason && <div className={s.cardMeta} style={{ whiteSpace: 'normal' }}>&ldquo;{l.reason}&rdquo;</div>}
                {l.clashing_bookings > 0 && l.status !== 'REJECTED' && l.status !== 'CANCELLED' && (
                  <div className={s.alertLine}><i className="fa-solid fa-calendar-xmark" /> {l.clashing_bookings} booking{l.clashing_bookings > 1 ? 's' : ''} in this period need another staff member.</div>
                )}
                {l.decision_note && <div className={s.cardMeta}>Note: {l.decision_note}</div>}
                <div className={s.cardActions}>
                  {owner && l.status === 'PENDING' && (
                    <>
                      <button type="button" className={`${s.btn} ${s.btnGreen}`} onClick={() => run(() => apiFetch(`/api/staff-ops/leave/${l.id}/approve`, { method: 'POST', body: '{}' }), `${l.staff_name}'s time off approved.`)}>Approve</button>
                      <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => run(() => apiFetch(`/api/staff-ops/leave/${l.id}/reject`, { method: 'POST', body: '{}' }), 'Request declined.')}>Decline</button>
                    </>
                  )}
                  {(l.status === 'PENDING' || l.status === 'APPROVED') && lastDay(l.end_at) >= today && (owner || l.staff_id === me?.staffId) && (
                    <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => run(() => apiFetch(`/api/staff-ops/leave/${l.id}/cancel`, { method: 'POST', body: '{}' }), 'Time off cancelled.')}>Cancel</button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={s.panel}>
          <div className={s.panelHead}>
            <div><h2><i className="fa-solid fa-right-left" style={{ color: '#6d4ae0' }} /> Shift swaps <span className={s.count}>{swaps.length}</span></h2>
              <p>When approved, the shift and that day&apos;s bookings move to the colleague.</p></div>
          </div>
          <div className={s.panelBody} style={{ display: 'grid', gap: 10 }}>
            {swaps.length === 0 && <div className={s.empty}><i className="fa-solid fa-right-left" /> No swaps yet.</div>}
            {swaps.map((w) => (
              <article key={w.id} className={s.card}>
                <div className={s.cardTop}>
                  <div style={{ minWidth: 0 }}>
                    <div className={s.cardName}>{w.from_name} <i className="fa-solid fa-arrow-right" style={{ fontSize: 11, color: '#7a879f' }} /> {w.to_name}</div>
                    <div className={s.cardMeta}>{dayLabel(w.shift_date)}{w.note ? ` · ${w.note}` : ''}</div>
                  </div>
                  <span className={`${s.tag} ${STATUS_TAG[w.status] || ''}`}>{SWAP_LABEL[w.status] || w.status}</span>
                </div>
                <div className={s.cardActions}>
                  {owner && (w.status === 'ACCEPTED' || w.status === 'PENDING') && (
                    <>
                      <button type="button" className={`${s.btn} ${s.btnGreen}`} onClick={() => run(() => apiFetch(`/api/staff-ops/swaps/${w.id}/approve`, { method: 'POST' }), 'Swap approved.')}>Approve</button>
                      <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => run(() => apiFetch(`/api/staff-ops/swaps/${w.id}/reject`, { method: 'POST' }), 'Swap not approved.')}>Reject</button>
                    </>
                  )}
                  {w.from_staff_id === me?.staffId && (w.status === 'PENDING' || w.status === 'ACCEPTED') && (
                    <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => run(() => apiFetch(`/api/staff-ops/swaps/${w.id}/cancel`, { method: 'POST' }), 'Swap request cancelled.')}>Cancel</button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {dialog === 'leave' && me && (
        <LeaveDialog me={me} onClose={() => setDialog(null)} onDone={(m) => { setDialog(null); setOk(m); void load(); }} />
      )}
      {dialog === 'swap' && me && (
        <SwapDialog me={me} onClose={() => setDialog(null)} onDone={(m) => { setDialog(null); setOk(m); void load(); }} />
      )}
      {affected && (
        <Dialog title="Bookings to rearrange" sub="These customers are booked with someone who is now away." onClose={() => setAffected(null)}
          footer={<button type="button" className={`${s.btn} ${s.btnLg} ${s.btnPrimary}`} onClick={() => setAffected(null)}>OK</button>}>
          {affected.items.map((b) => (
            <div key={b.id} className={s.alertLine}><i className="fa-solid fa-calendar-xmark" /> {dayLabel(b.booking_time.slice(0, 10))} {hm(b.booking_time)} · {b.customer_name} · {b.public_code}</div>
          ))}
          <p className={s.muted} style={{ margin: 0, fontSize: '0.82rem' }}>Move them to another team member from the front desk on the day, or reschedule under Bookings.</p>
        </Dialog>
      )}
    </div>
  );
}

function LeaveDialog({ me, onClose, onDone }: { me: Me; onClose: () => void; onDone: (m: string) => void }) {
  const today = todayIso();
  const [staffId, setStaffId] = useState(me.owner ? '' : String(me.staffId || ''));
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [kind, setKind] = useState('LEAVE');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setError(null);
    try {
      await apiFetch('/api/staff-ops/leave', { method: 'POST', body: JSON.stringify({ staffId: staffId ? Number(staffId) : null, from, to, kind, reason }) });
      onDone(me.owner ? 'Time off added and approved.' : 'Request sent. You will be notified when it is decided.');
    } catch (e) { setError(errMsg(e)); }
  };
  return (
    <Dialog title={me.owner ? 'Add time off' : 'Request time off'} sub={me.owner ? 'Time off you add is approved straight away.' : 'Your manager will approve or decline it.'} onClose={onClose}
      footer={<button type="button" className={`${s.btn} ${s.btnLg} ${s.btnPrimary}`} disabled={me.owner && !staffId} onClick={save}>{me.owner ? 'Add time off' : 'Send request'}</button>}>
      <div className={s.fields}>
        {me.owner && (
          <div className={`${s.field} ${s.fieldFull}`}>
            <span className={s.label}>Team member</span>
            <Dropdown aria-label="Team member" value={staffId} onChange={setStaffId} icon="fa-user" placeholder="Choose a team member"
              options={me.staff.map((m) => ({ value: String(m.id), label: m.name }))} />
          </div>
        )}
        <div className={s.field}><span className={s.label}>From</span><DatePicker value={from} min={today} onChange={(d) => { setFrom(d); if (d > to) setTo(d); }} aria-label="From" /></div>
        <div className={s.field}><span className={s.label}>To (inclusive)</span><DatePicker value={to} min={from} onChange={setTo} aria-label="To" /></div>
        <div className={`${s.field} ${s.fieldFull}`}>
          <span className={s.label}>Type</span>
          <Dropdown aria-label="Type" value={kind} onChange={setKind} options={KIND} />
        </div>
        <label className={`${s.field} ${s.fieldFull}`}>
          <span className={s.label}>Reason <span className={s.hint}>(optional)</span></span>
          <input className={s.input} value={reason} maxLength={255} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Family wedding" />
        </label>
      </div>
      {error && <div className={s.err}>{error}</div>}
    </Dialog>
  );
}

function SwapDialog({ me, onClose, onDone }: { me: Me; onClose: () => void; onDone: (m: string) => void }) {
  const [to, setTo] = useState('');
  const [date, setDate] = useState(addDays(todayIso(), 1));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setError(null);
    try {
      await apiFetch('/api/staff-ops/swaps', { method: 'POST', body: JSON.stringify({ toStaffId: Number(to), date, note }) });
      onDone('Swap request sent to your colleague.');
    } catch (e) { setError(errMsg(e)); }
  };
  return (
    <Dialog title="Ask a colleague to cover" sub="They accept first, then your manager approves. Your bookings that day move to them." onClose={onClose}
      footer={<button type="button" className={`${s.btn} ${s.btnLg} ${s.btnPrimary}`} disabled={!to} onClick={save}>Send request</button>}>
      <div className={s.fields}>
        <div className={s.field}>
          <span className={s.label}>Colleague</span>
          <Dropdown aria-label="Colleague" value={to} onChange={setTo} icon="fa-user" placeholder="Choose"
            options={me.staff.filter((m) => m.id !== me.staffId).map((m) => ({ value: String(m.id), label: m.name }))} />
        </div>
        <div className={s.field}><span className={s.label}>Day</span><DatePicker value={date} min={todayIso()} onChange={setDate} aria-label="Day" /></div>
        <label className={`${s.field} ${s.fieldFull}`}>
          <span className={s.label}>Message <span className={s.hint}>(optional)</span></span>
          <input className={s.input} value={note} maxLength={255} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Doctor's appointment" />
        </label>
      </div>
      {error && <div className={s.err}>{error}</div>}
    </Dialog>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Dropdown, { Switch } from '@/components/ui/Dropdown';
import DatePicker, { TimePicker } from '@/components/ui/DatePicker';
import { addDays, avatarColor, dayLabel, errMsg, hm, initials, todayIso, type Me } from '@/lib/ops';
import Dialog from './Dialog';
import OpsHero, { Notice } from './OpsHero';
import s from './ops.module.css';

type Cell = {
  date: string;
  source: 'CHANGED' | 'STAFF' | 'BRANCH';
  off: boolean;
  start?: string;
  end?: string;
  intervals?: string[];
  note?: string | null;
  leave?: { id: number; kind: string; status: string };
  bookings: number;
};
type Row = { staffId: number; name: string; designation?: string; branchName?: string; plannedHours: number; days: Cell[] };
type Week = { weekStart: string; branches: { id: number; name: string }[]; staff: Row[] };
type Affected = { id: number; public_code: string; booking_time: string; customer_name: string }[];

/** Weekly rota. Weekly hours come from Availability; changes for a single day are made here. */
export default function Rota() {
  const [me, setMe] = useState<Me | null>(null);
  const [week, setWeek] = useState<Week | null>(null);
  const [anchor, setAnchor] = useState(todayIso());
  const [branchId, setBranchId] = useState('');
  const [edit, setEdit] = useState<{ row: Row; cell: Cell } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ week: anchor });
      if (branchId) qs.set('branchId', branchId);
      setWeek(await apiFetch<Week>(`/api/staff-ops/rota?${qs}`));
    } catch (e) { setError(errMsg(e)); }
  }, [anchor, branchId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  useEffect(() => { apiFetch<Me>('/api/front-desk/me').then(setMe).catch(() => null); }, []);

  const owner = !!me?.owner;
  const today = todayIso();
  const days = week ? Array.from({ length: 7 }, (_, i) => addDays(week.weekStart, i)) : [];
  const total = week?.staff.reduce((a, r) => a + r.plannedHours, 0) || 0;

  const copyPrevious = async () => {
    try {
      const r = await apiFetch<{ copied: number }>(`/api/staff-ops/rota/copy-previous?week=${week?.weekStart}`, { method: 'POST' });
      setOk(r.copied ? `Copied ${r.copied} shift change${r.copied > 1 ? 's' : ''} from last week.` : 'Last week had no changes to copy.');
      void load();
    } catch (e) { setError(errMsg(e)); }
  };

  return (
    <div className={s.page}>
      <OpsHero eyebrow={owner ? 'Team · Staff schedule' : 'Team · My shifts'} title={owner ? 'Staff schedule' : 'My shifts'}
        text={owner ? 'Everyone\'s hours for the week. Click a day to change it just for that date. Regular weekly hours are set under Availability.'
          : 'Your hours for the week, including any changes and approved time off.'}
        actions={owner ? <button type="button" className={s.glassBtn} onClick={copyPrevious}><i className="fa-solid fa-copy" /> Copy last week&apos;s changes</button> : null}>
        <div className={s.dayNav}>
          <button type="button" className={s.glassBtn} aria-label="Previous week" onClick={() => setAnchor(addDays(week?.weekStart || anchor, -7))}><i className="fa-solid fa-chevron-left" /></button>
          <div style={{ width: 200 }}><DatePicker value={anchor} onChange={(d) => setAnchor(d || today)} aria-label="Week" /></div>
          <button type="button" className={s.glassBtn} aria-label="Next week" onClick={() => setAnchor(addDays(week?.weekStart || anchor, 7))}><i className="fa-solid fa-chevron-right" /></button>
          <button type="button" className={s.glassBtn} onClick={() => setAnchor(today)}>This week</button>
        </div>
        {owner && (week?.branches.length || 0) > 1 && (
          <div style={{ width: 220 }}>
            <Dropdown icon="fa-location-dot" aria-label="Branch" value={branchId} onChange={setBranchId}
              options={[{ value: '', label: 'All branches' }, ...(week?.branches || []).map((b) => ({ value: String(b.id), label: b.name }))]} />
          </div>
        )}
        {week && <span className={s.clock}>{Math.round(total)} planned hours</span>}
      </OpsHero>

      <Notice error={error} ok={ok} />

      <section className={s.panel}>
        <div className={s.panelHead}>
          <div>
            <h2><i className="fa-solid fa-calendar-week" style={{ color: '#2563eb' }} /> Week of {week ? dayLabel(week.weekStart) : '…'}</h2>
            <p>Blue days are changed from the usual hours. Amber is time off. The number shows bookings that day.</p>
          </div>
        </div>
        <div className={`${s.tableWrap} ${s.panelBody}`}>
          <table className={`${s.table} ${s.rota}`}>
            <thead>
              <tr>
                <th>Team member</th>
                {days.map((d) => <th key={d} className={d === today ? s.today : ''}>{dayLabel(d)}</th>)}
                <th className={s.num}>Hours</th>
              </tr>
            </thead>
            <tbody>
              {week?.staff.map((r) => (
                <tr key={r.staffId}>
                  <td>
                    <div className={s.tlWho}>
                      <span className={s.avatar} style={{ background: avatarColor(r.staffId) }}>{initials(r.name)}</span>
                      <div style={{ minWidth: 0 }}>
                        <div className={s.tlName}>{r.name}</div>
                        <div className={s.tlState}>{r.designation || r.branchName}</div>
                      </div>
                    </div>
                  </td>
                  {r.days.map((c) => {
                    const leave = c.leave && c.leave.status === 'APPROVED';
                    const pending = c.leave && c.leave.status === 'PENDING';
                    const cls = leave ? s.shiftLeave : c.off ? s.shiftOff : c.source === 'CHANGED' ? s.shiftChanged : '';
                    return (
                      <td key={c.date}>
                        <button type="button" className={`${s.shift} ${cls} ${pending ? s.shiftPending : ''}`} disabled={!owner}
                          onClick={() => setEdit({ row: r, cell: c })} title={c.note || undefined}
                          aria-label={`${r.name}, ${dayLabel(c.date)}: ${c.off ? 'off' : `${hm(c.start)} to ${hm(c.end)}`}`}>
                          <strong>{leave ? (c.leave!.kind === 'SICK' ? 'Sick' : 'Time off') : c.off ? 'Off' : `${hm(c.start)} – ${hm(c.end)}`}</strong>
                          <span>
                            {pending ? 'Leave requested' : c.source === 'CHANGED' ? (c.note || 'Changed') : c.off ? '' : `${c.bookings} booking${c.bookings === 1 ? '' : 's'}`}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                  <td className={`${s.num} ${s.strong}`}>{r.plannedHours}</td>
                </tr>
              ))}
              {week && week.staff.length === 0 && (
                <tr><td colSpan={9}><div className={s.empty}><i className="fa-solid fa-user-plus" /> No team members yet.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {edit && (
        <ShiftDialog row={edit.row} cell={edit.cell} onClose={() => setEdit(null)}
          onSaved={(msg) => { setEdit(null); setOk(msg); void load(); }} />
      )}
    </div>
  );
}

function ShiftDialog({ row, cell, onClose, onSaved }: { row: Row; cell: Cell; onClose: () => void; onSaved: (msg: string) => void }) {
  const [off, setOff] = useState(cell.off);
  const [start, setStart] = useState(cell.start?.slice(0, 5) || '09:00');
  const [end, setEnd] = useState(cell.end?.slice(0, 5) || '17:00');
  const [note, setNote] = useState(cell.source === 'CHANGED' ? cell.note || '' : '');
  const [affected, setAffected] = useState<Affected | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    try {
      const r = await apiFetch<{ affected: Affected }>('/api/staff-ops/rota/shift', {
        method: 'PUT', body: JSON.stringify({ staffId: row.staffId, date: cell.date, start, end, off, note }),
      });
      if (r.affected.length) setAffected(r.affected);
      else onSaved(`${row.name}'s ${dayLabel(cell.date)} updated.`);
    } catch (e) { setError(errMsg(e)); }
  };
  const reset = async () => {
    await apiFetch(`/api/staff-ops/rota/shift?staffId=${row.staffId}&date=${cell.date}`, { method: 'DELETE' }).catch(() => null);
    onSaved(`${row.name}'s ${dayLabel(cell.date)} is back to the usual hours.`);
  };

  if (affected) {
    return (
      <Dialog title="Shift saved, but check these bookings" sub={`${row.name} has bookings on ${dayLabel(cell.date)} outside the new hours.`} onClose={() => onSaved('Shift saved.')}
        footer={<button type="button" className={`${s.btn} ${s.btnLg} ${s.btnPrimary}`} onClick={() => onSaved('Shift saved.')}>OK</button>}>
        {affected.map((b) => (
          <div key={b.id} className={s.alertLine}><i className="fa-solid fa-calendar-xmark" /> {hm(b.booking_time)} · {b.customer_name} · {b.public_code}</div>
        ))}
        <p className={s.muted} style={{ margin: 0, fontSize: '0.82rem' }}>Move them to someone else from the front desk, or reschedule them under Bookings.</p>
      </Dialog>
    );
  }

  return (
    <Dialog title={`${row.name} · ${dayLabel(cell.date)}`} sub="Change the hours for this one day. The usual weekly hours stay as they are." onClose={onClose}
      footer={(
        <>
          {cell.source === 'CHANGED' && <button type="button" className={`${s.btn} ${s.btnLg}`} onClick={reset}>Use usual hours</button>}
          <button type="button" className={`${s.btn} ${s.btnLg} ${s.btnPrimary}`} onClick={save}>Save</button>
        </>
      )}>
      <Switch label="Day off" checked={off} onChange={setOff} />
      {!off && (
        <div className={s.fields}>
          <div className={s.field}><span className={s.label}>Start</span><TimePicker value={start} onChange={setStart} aria-label="Start" /></div>
          <div className={s.field}><span className={s.label}>End</span><TimePicker value={end} onChange={setEnd} min={start} aria-label="End" /></div>
        </div>
      )}
      <label className={s.field}>
        <span className={s.label}>Note <span className={s.hint}>(shown to {row.name.split(' ')[0]})</span></span>
        <input className={s.input} value={note} maxLength={255} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Covering the evening" />
      </label>
      {error && <div className={s.err}>{error}</div>}
    </Dialog>
  );
}

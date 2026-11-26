'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import DateRangePicker from '@/components/ui/DateRangePicker';
import { DateTimePicker } from '@/components/ui/DatePicker';
import { addDays, avatarColor, dayLabel, dur, errMsg, hm, initials, periodPresets, todayIso, type Me } from '@/lib/ops';
import Dialog from './Dialog';
import OpsHero, { Kpi, Notice } from './OpsHero';
import s from './ops.module.css';

type Person = { staffId: number; name: string; scheduledHours: number; workedHours: number; daysWorked: number; lateStarts: number; missedShifts: number; usesClock: boolean };
type Rec = { id: number; staffId: number; staffName: string; date: string; in: string; out: string | null; breakMinutes: number; note?: string; shiftStart?: string | null; late: boolean };
type Report = { from: string; to: string; lateAfterMinutes: number; people: Person[]; records: Rec[] };

const minsBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);

/** Clock in / out and the attendance report: hours worked against the rota, late starts and missed shifts. */
export default function Attendance() {
  const [me, setMe] = useState<Me | null>(null);
  const [range, setRange] = useState({ from: addDays(todayIso(), -13), to: todayIso(), preset: '14d' });
  const [report, setReport] = useState<Report | null>(null);
  const [edit, setEdit] = useState<Rec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [tick, setTick] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const [m, r] = await Promise.all([
        apiFetch<Me>('/api/front-desk/me'),
        apiFetch<Report>(`/api/staff-ops/attendance?from=${range.from}&to=${range.to}`),
      ]);
      setMe(m);
      setReport(r);
    } catch (e) { setError(errMsg(e)); }
  }, [range]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  useEffect(() => { const t = window.setInterval(() => setTick(Date.now()), 30000); return () => window.clearInterval(t); }, []);

  const clock = async (dir: 'in' | 'out', staffId?: number) => {
    setError(null);
    try {
      await apiFetch(`/api/staff-ops/clock/${dir}`, { method: 'POST', body: JSON.stringify({ staffId: staffId ?? null }) });
      setOk(dir === 'in' ? 'Clocked in.' : 'Clocked out.');
      void load();
    } catch (e) { setError(errMsg(e)); }
  };

  const owner = !!me?.owner;
  const openRecords = (report?.records || []).filter((r) => !r.out);
  const totals = (report?.people || []).reduce((a, p) => ({ worked: a.worked + p.workedHours, sched: a.sched + p.scheduledHours, late: a.late + p.lateStarts, missed: a.missed + p.missedShifts }), { worked: 0, sched: 0, late: 0, missed: 0 });
  const myOpen = me?.clock?.clockedIn ? me.clock.since : null;

  return (
    <div className={s.page}>
      <OpsHero eyebrow="Team · Attendance" title={owner ? 'Attendance' : 'My attendance'}
        text="Clock in when you start and out when you leave. Hours are compared with the staff schedule and feed into the pay summary.">
        <div style={{ width: 280 }}>
          <DateRangePicker from={range.from} to={range.to} preset={range.preset} presets={periodPresets()} max={todayIso()}
            onChange={(r) => setRange(r)} />
        </div>
      </OpsHero>

      <Notice error={error} ok={ok} />

      {me?.staffId && (
        <section className={`${s.panel} ${s.clockCard}`}>
          <div>
            <div className={s.kpiLabel}>{myOpen ? 'You are clocked in' : 'You are clocked out'}</div>
            <div className={s.bigClock}>{myOpen ? dur(Math.max(0, Math.round((tick - new Date(myOpen).getTime()) / 60000))) : new Date(tick).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
            <div className={s.kpiSub}>{myOpen ? `Since ${hm(myOpen)}` : 'Clock in when your shift starts.'}</div>
          </div>
          {myOpen
            ? <button type="button" className={`${s.btn} ${s.btnLg}`} onClick={() => clock('out')}><i className="fa-solid fa-right-from-bracket" /> Clock out</button>
            : <button type="button" className={`${s.btn} ${s.btnLg} ${s.btnGreen}`} onClick={() => clock('in')}><i className="fa-solid fa-right-to-bracket" /> Clock in</button>}
        </section>
      )}

      <div className={s.kpis}>
        <Kpi label="Hours worked" value={Math.round(totals.worked * 10) / 10} sub={`of ${Math.round(totals.sched)} scheduled`} icon="fa-business-time" tone={s.tBlue} />
        <Kpi label="On the clock now" value={openRecords.length} sub={openRecords.map((r) => r.staffName.split(' ')[0]).join(', ') || 'nobody'} icon="fa-user-clock" tone={s.tGreen} />
        <Kpi label="Late starts" value={totals.late} sub={`more than ${report?.lateAfterMinutes ?? 10} min after shift start`} icon="fa-hourglass-end" tone={totals.late ? s.tAmber : s.tSlate} />
        <Kpi label="Missed shifts" value={totals.missed} sub="scheduled day with no clock-in" icon="fa-calendar-xmark" tone={totals.missed ? s.tRed : s.tSlate} />
      </div>

      <section className={s.panel}>
        <div className={s.panelHead}><div><h2><i className="fa-solid fa-users" style={{ color: '#2563eb' }} /> By person</h2><p>{dayLabel(range.from)} – {dayLabel(range.to)}</p></div></div>
        <div className={`${s.tableWrap} ${s.panelBody}`}>
          <table className={s.table}>
            <thead><tr><th>Team member</th><th className={s.num}>Scheduled hours</th><th className={s.num}>Worked</th><th>Of scheduled</th><th className={s.num}>Days</th><th className={s.num}>Late</th><th className={s.num}>Missed</th>{owner && <th />}</tr></thead>
            <tbody>
              {(report?.people || []).map((p) => {
                const pct = p.scheduledHours ? Math.min(100, Math.round((p.workedHours / p.scheduledHours) * 100)) : 0;
                const open = openRecords.find((r) => r.staffId === p.staffId);
                return (
                  <tr key={p.staffId}>
                    <td><div className={s.tlWho}><span className={s.avatar} style={{ background: avatarColor(p.staffId) }}>{initials(p.name)}{open && <span className={s.clockDot} />}</span><span className={s.tlName}>{p.name}</span></div></td>
                    <td className={s.num}>{p.scheduledHours}</td>
                    <td className={`${s.num} ${s.strong}`}>{p.workedHours}</td>
                    <td><div className={`${s.progress} ${pct >= 90 ? s.progressGood : s.progressBehind}`}><span style={{ width: `${pct}%` }} /></div></td>
                    <td className={s.num}>{p.daysWorked}</td>
                    <td className={s.num}>{p.lateStarts || '—'}</td>
                    <td className={s.num}>{p.usesClock ? (p.missedShifts || '—') : <span className={s.muted} title="Doesn't use the clock yet">n/a</span>}</td>
                    {owner && (
                      <td className={s.num}>
                        {open ? <button type="button" className={s.btn} onClick={() => clock('out', p.staffId)}>Clock out</button>
                          : <button type="button" className={s.btn} onClick={() => clock('in', p.staffId)}>Clock in</button>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={s.panel}>
        <div className={s.panelHead}><div><h2><i className="fa-solid fa-list" style={{ color: '#2563eb' }} /> Clock records <span className={s.count}>{report?.records.length || 0}</span></h2><p>{owner ? 'Fix a forgotten clock-out by editing the record.' : 'Your clock-ins and outs.'}</p></div></div>
        <div className={`${s.tableWrap} ${s.panelBody}`}>
          {report && report.records.length === 0 ? <div className={s.empty}><i className="fa-regular fa-clock" /> No clock records in this period.</div> : (
            <table className={s.table}>
              <thead><tr><th>Day</th><th>Team member</th><th>Shift starts</th><th>In</th><th>Out</th><th className={s.num}>Break</th><th className={s.num}>Hours</th>{owner && <th />}</tr></thead>
              <tbody>
                {(report?.records || []).map((r) => (
                  <tr key={r.id}>
                    <td>{dayLabel(r.date)}</td>
                    <td className={s.strong}>{r.staffName}</td>
                    <td className={s.muted}>{r.shiftStart ? hm(r.shiftStart) : '—'}</td>
                    <td>{hm(r.in)} {r.late && <span className={`${s.tag} ${s.tagAmber}`}>late</span>}</td>
                    <td>{r.out ? hm(r.out) : <span className={`${s.tag} ${s.tagGreen}`}>on the clock</span>}</td>
                    <td className={s.num}>{r.breakMinutes ? `${r.breakMinutes} min` : '—'}</td>
                    <td className={`${s.num} ${s.strong}`}>{r.out ? (Math.max(0, minsBetween(r.in, r.out) - r.breakMinutes) / 60).toFixed(1) : '—'}</td>
                    {owner && <td className={s.num}><button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => setEdit(r)}>Edit</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {edit && <EditDialog rec={edit} onClose={() => setEdit(null)} onSaved={(m) => { setEdit(null); setOk(m); void load(); }} />}
    </div>
  );
}

function EditDialog({ rec, onClose, onSaved }: { rec: Rec; onClose: () => void; onSaved: (m: string) => void }) {
  const [inAt, setIn] = useState(rec.in.slice(0, 16));
  const [outAt, setOut] = useState(rec.out ? rec.out.slice(0, 16) : '');
  const [brk, setBrk] = useState(String(rec.breakMinutes || 0));
  const [note, setNote] = useState(rec.note || '');
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    try {
      await apiFetch(`/api/staff-ops/attendance/${rec.id}`, { method: 'PUT', body: JSON.stringify({ in: inAt, out: outAt || null, breakMinutes: Number(brk) || 0, note }) });
      onSaved('Record updated.');
    } catch (e) { setError(errMsg(e)); }
  };
  const remove = async () => {
    await apiFetch(`/api/staff-ops/attendance/${rec.id}`, { method: 'DELETE' }).catch(() => null);
    onSaved('Record deleted.');
  };
  return (
    <Dialog title={`${rec.staffName} · ${dayLabel(rec.date)}`} sub="Correct the times if someone forgot to clock in or out." onClose={onClose}
      footer={(
        <>
          <button type="button" className={`${s.btn} ${s.btnLg} ${s.btnDanger}`} onClick={remove}>Delete</button>
          <button type="button" className={`${s.btn} ${s.btnLg} ${s.btnPrimary}`} onClick={save}>Save</button>
        </>
      )}>
      <div className={s.field}><span className={s.label}>Clocked in</span><DateTimePicker value={inAt} onChange={setIn} /></div>
      <div className={s.field}><span className={s.label}>Clocked out</span><DateTimePicker value={outAt} onChange={setOut} /></div>
      <div className={s.fields}>
        <label className={s.field}><span className={s.label}>Break (minutes)</span><input className={s.input} type="number" min={0} value={brk} onChange={(e) => setBrk(e.target.value)} /></label>
        <label className={s.field}><span className={s.label}>Note</span><input className={s.input} value={note} maxLength={255} onChange={(e) => setNote(e.target.value)} /></label>
      </div>
      {error && <div className={s.err}>{error}</div>}
    </Dialog>
  );
}

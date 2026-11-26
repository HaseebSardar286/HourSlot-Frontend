'use client';

import { avatarColor, dur, hm, initials, minutesOf, type Lane, type QueueEntry, type Visit } from '@/lib/ops';
import s from './ops.module.css';

const STAGE_CLASS: Record<string, string> = {
  EXPECTED: s.bExpected,
  ARRIVED: s.bArrived,
  IN_SERVICE: s.bService,
  DONE: s.bDone,
};

function laneState(l: Lane) {
  switch (l.state) {
    case 'FREE': return <span className={s.stFree}>Free{l.freeMinutes != null ? ` · ${dur(l.freeMinutes)} gap` : ''}</span>;
    case 'BUSY': return <span className={s.stBusy}>Busy until {hm(l.busyUntil)}</span>;
    case 'BREAK': return <span className={s.stOff}>On a break</span>;
    case 'OUT_OF_HOURS': return <span className={s.stOff}>Not on shift now</span>;
    case 'OFF': return <span className={s.stOff}>{l.offReason || 'Off today'}</span>;
    default: return l.off ? <span className={s.stOff}>{l.offReason || 'Off'}</span> : <span>{l.utilisation}% booked</span>;
  }
}

/** One row per staff member across the working day: shifts, breaks, bookings, queued walk-ins and a "now" line. */
export default function StaffTimeline({
  lanes, visits, queue, now, isToday, onOpen,
}: { lanes: Lane[]; visits: Visit[]; queue: QueueEntry[]; now: string; isToday: boolean; onOpen: (v: Visit) => void }) {
  const working = lanes.filter((l) => l.windows.length);
  const shown = visits.filter((v) => v.stage !== 'CANCELLED' && v.stage !== 'NO_SHOW');
  const starts = [...working.flatMap((l) => l.windows.map((w) => minutesOf(w.start))), ...shown.map((v) => minutesOf(v.start))];
  const ends = [...working.flatMap((l) => l.windows.map((w) => minutesOf(w.end))), ...shown.map((v) => minutesOf(v.end))];
  const from = Math.floor(((starts.length ? Math.min(...starts) : 9 * 60) - 30) / 60) * 60;
  const to = Math.ceil(((ends.length ? Math.max(...ends) : 18 * 60) + 30) / 60) * 60;
  const span = Math.max(60, to - from);
  const pct = (m: number) => `${((Math.max(from, Math.min(to, m)) - from) / span) * 100}%`;
  const width = (a: number, b: number) => `${((Math.min(to, b) - Math.max(from, a)) / span) * 100}%`;
  const nowMin = minutesOf(now);
  const ticks: number[] = [];
  for (let m = from; m <= to; m += span > 12 * 60 ? 120 : 60) ticks.push(m);

  return (
    <div className={s.timeline}>
      <div className={s.tlInner}>
        <div className={s.tlAxis}>
          <div />
          <div className={s.tlTicks}>
            {ticks.map((m) => (
              <span key={m} className={s.tlTick} style={{ left: pct(m) }}>{hm(`${String(Math.floor(m / 60) % 24).padStart(2, '0')}:00`)}</span>
            ))}
          </div>
        </div>
        {lanes.map((l) => {
          const mine = shown.filter((v) => v.staffId === l.staffId);
          const queued = queue.filter((q) => q.suggestedStaffId === l.staffId && q.estimatedStart);
          return (
            <div key={l.staffId} className={s.tlRow}>
              <div className={s.tlWho}>
                <span className={s.avatar} style={{ background: avatarColor(l.staffId) }}>
                  {initials(l.name)}
                  {l.clockedIn && <span className={s.clockDot} title="Clocked in" />}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className={s.tlName}>{l.name}</div>
                  <div className={s.tlState}>{laneState(l)}</div>
                </div>
              </div>
              <div className={`${s.track} ${l.off ? s.trackOff : ''}`} aria-label={`${l.name} schedule`}>
                {l.windows.map((w, i) => (
                  <span key={`w${i}`} className={s.work} style={{ left: pct(minutesOf(w.start)), width: width(minutesOf(w.start), minutesOf(w.end)) }} />
                ))}
                {l.breaks.map((b, i) => (
                  <span key={`b${i}`} className={s.brk} title={`Break ${hm(b.start)} – ${hm(b.end)}`}
                    style={{ left: pct(minutesOf(b.start)), width: width(minutesOf(b.start), minutesOf(b.end)) }} />
                ))}
                {mine.map((v) => {
                  const a = minutesOf(v.start);
                  const b = Math.max(minutesOf(v.end), a + 10);
                  // Short blocks only fit initials; the full details are in the tooltip and on click.
                  const compact = (b - a) / span < 0.06;
                  return (
                    <button key={v.id} type="button" onClick={() => onOpen(v)}
                      className={`${s.block} ${v.late ? s.bLate : STAGE_CLASS[v.stage] || s.bExpected}`}
                      style={{ left: pct(a), width: width(a, b), ...(compact ? { padding: '3px 4px', textAlign: 'center' } : {}) }}
                      title={`${hm(v.start)} – ${hm(v.end)} · ${v.customerName} · ${v.serviceName || ''}`}
                      aria-label={`${v.customerName}, ${hm(v.start)}`}>
                      {compact ? initials(v.customerName) : v.customerName}
                      <small>{hm(v.start)}{compact ? '' : ` · ${v.serviceName || ''}`}</small>
                    </button>
                  );
                })}
                {queued.map((q) => {
                  const a = minutesOf(q.estimatedStart!);
                  const compact = q.minutes / span < 0.06;
                  return (
                    <span key={`q${q.id}`} className={`${s.block} ${s.bQueue}`}
                      style={{ left: pct(a), width: width(a, a + q.minutes), ...(compact ? { padding: '3px 4px', textAlign: 'center' } : {}) }}
                      title={`Walk-in #${q.ticket_number} ${q.customer_name}, planned ${hm(q.estimatedStart)}`}>
                      #{q.ticket_number}
                      <small>{compact ? hm(q.estimatedStart).replace(/ (AM|PM)/, '') : `${q.customer_name} · ${hm(q.estimatedStart)}`}</small>
                    </span>
                  );
                })}
                {isToday && nowMin >= from && nowMin <= to && <span className={s.now} style={{ left: pct(nowMin) }} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

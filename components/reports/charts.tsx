'use client';

import { useState, type CSSProperties } from 'react';
import { WEEKDAYS, compact, delta, full, shortDate } from '@/lib/insights';
import r from './reports.module.css';
import CountUp from '@/components/CountUp';

/** Categorical slots in fixed order (validated on white). Colour follows the entity, never its rank. */
export const SERIES = ['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16'];
/** Status colours, reserved for outcomes; always shown with a label. */
export const STATUS_COLOR: Record<string, string> = {
  COMPLETED: '#0ca30c',
  CONFIRMED: '#2a78d6',
  PENDING: '#fab219',
  IN_PROGRESS: '#2a78d6',
  RESCHEDULED: '#6da7ec',
  NO_SHOW: '#d03b3b',
  CANCELLED: '#9aa3b2',
  REJECTED: '#ec835a',
};

/** Smooth path through points (Catmull-Rom as cubic Béziers); control points never dip below `floor`. */
export function smoothPath(pts: [number, number][], floor?: number) {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const t = 0.18;
    let c1y = p1[1] + (p2[1] - p0[1]) * t;
    let c2y = p2[1] - (p3[1] - p1[1]) * t;
    if (floor !== undefined) { c1y = Math.min(c1y, floor); c2y = Math.min(c2y, floor); }
    const c1x = p1[0] + (p2[0] - p0[0]) * t;
    const c2x = p2[0] - (p3[0] - p1[0]) * t;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

const tone = (c: string) => ({ ['--tone' as string]: c }) as CSSProperties;

/** A stable colour per entity id, taken from a fixed ordering of all entities (not from the current sort). */
export function colorFor(id: number | string, order: (number | string)[]) {
  const i = order.indexOf(id);
  return i < 0 ? '#8a94a6' : i < SERIES.length ? SERIES[i] : '#8a94a6';
}

// ---------------------------------------------------------------- KPI card

export function KpiCard({ label, value, icon, color, now, before, invert, sub, spark }: {
  label: string;
  value: string;
  icon: string;
  color: string;
  now?: number;
  before?: number;
  /** Lower is better (no-shows, cancellations). */
  invert?: boolean;
  sub?: string;
  spark?: number[];
}) {
  const d = now === undefined || before === undefined ? null : delta(now, before);
  const good = d === null || d === 0 ? null : invert ? d < 0 : d > 0;
  return (
    <div className={r.kpi} style={tone(color)}>
      <div className={r.kpiHead}>
        <span className={r.kpiLabel}>{label}</span>
        <span className={r.kpiIcon}><i className={`fa-solid ${icon}`} aria-hidden /></span>
      </div>
      <span className={r.kpiValue}><CountUp value={value} /></span>
      {spark && spark.length > 1 && <Sparkline values={spark} color={color} />}
      <div className={r.kpiFoot}>
        {d !== null && (
          <span className={`${r.delta} ${good === null ? r.deltaFlat : good ? r.deltaGood : r.deltaBad}`}>
            {d !== 0 && <i className={`fa-solid ${d > 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`} aria-hidden />}
            {d === 0 ? 'No change' : `${Math.abs(d)}%`}
            <span className={r.srOnly}>{d > 0 ? ' higher' : d < 0 ? ' lower' : ''}</span>
          </span>
        )}
        <span>{sub || (d !== null ? 'vs previous period' : before !== undefined ? 'No data for the previous period' : '')}</span>
      </div>
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const W = 200;
  const H = 34;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - 3 - (v / max) * (H - 6)]);
  const line = smoothPath(pts as [number, number][], H - 1);
  const id = `sp${color.replace('#', '')}`;
  return (
    <svg className={r.spark} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className={r.fadeArea} d={`${line} L${W},${H} L0,${H} Z`} fill={`url(#${id})`} />
      <path className={r.draw} pathLength={1} d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------- area trend

type TrendPoint = { period: string; bookings: number; completed: number; earned: number };

/** One measure at a time over time (no dual axis), with a crosshair and a tooltip showing the others. */
export function AreaTrend({ data, metric, bucket, currency }: {
  data: TrendPoint[];
  metric: 'earned' | 'bookings';
  bucket: 'day' | 'week' | 'month';
  currency: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 760;
  const H = 260;
  const pad = { l: 56, r: 12, t: 14, b: 28 };
  const color = metric === 'earned' ? SERIES[0] : SERIES[2];
  const vals = data.map((d) => Number(d[metric] || 0));
  const max = niceMax(Math.max(...vals, 0));
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const n = data.length;
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const line = smoothPath(vals.map((v, i) => [x(i), y(v)] as [number, number]), y(0));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const every = Math.max(1, Math.ceil(n / 8));
  const fmt = (v: number) => (metric === 'earned' ? compact(v) : compact(v));
  const gid = `area-${metric}`;

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const rel = ((e.clientX - box.left) / box.width) * iw;
    setHover(Math.max(0, Math.min(n - 1, Math.round((rel / iw) * (n - 1)))));
  };

  if (n === 0) return null;
  return (
    <div className={r.chartWrap}>
      <svg viewBox={`0 0 ${W} ${H}`} className={r.chart} role="img" aria-label={`${metric === 'earned' ? 'Earnings' : 'Bookings'} by ${bucket}`}>
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.38" />
            <stop offset="1" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={t}>
            <line className={i === 0 ? r.base : r.grid} x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
            <text className={r.axis} x={pad.l - 8} y={y(t) + 4} textAnchor="end">{fmt(t)}</text>
          </g>
        ))}
        {data.map((d, i) => i % every === 0 && (
          <text key={d.period} className={r.axis} x={x(i)} y={H - 8} textAnchor="middle">{shortDate(d.period, bucket)}</text>
        ))}
        <path className={r.fadeArea} d={`${line} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#${gid})`} />
        <path className={r.draw} pathLength={1} d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {n <= 45 && vals.map((v, i) => v > 0 && (
          <circle key={i} className={r.pointIn} style={{ animationDelay: `${300 + i * 12}ms` }} cx={x(i)} cy={y(v)} r="2.6" fill="#fff" stroke={color} strokeWidth="1.6" />
        ))}
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="#0f1b33" strokeOpacity="0.25" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(vals[hover])} r="5.5" fill={color} stroke="#fff" strokeWidth="2.5" />
          </>
        )}
        <rect x={pad.l} y={pad.t} width={iw} height={ih} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </svg>
      {hover !== null && (
        <div className={r.tip} style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(vals[hover]) / H) * 100}%` }}>
          <strong>{bucket === 'week' ? `Week of ${shortDate(data[hover].period)}` : shortDate(data[hover].period, bucket)}</strong>
          <span className={r.tipDot} style={{ background: SERIES[0] }} />{full(data[hover].earned, currency)} earned<br />
          <span className={r.tipDot} style={{ background: SERIES[2] }} />{data[hover].bookings} bookings · {data[hover].completed} completed
        </div>
      )}
    </div>
  );
}

function niceMax(v: number) {
  if (v <= 0) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

// ---------------------------------------------------------------- donut

export function Donut({ items, centerValue, centerLabel }: {
  items: { key: string; label: string; value: number; color: string; display?: string }[];
  centerValue: string;
  centerLabel: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const total = items.reduce((n, i) => n + i.value, 0);
  const R = 62;
  const SW = 20;
  const C = 2 * Math.PI * R;
  const shown = items.filter((i) => i.value > 0);
  const gap = shown.length > 1 ? 2 : 0;
  const segs = shown.map((i, idx) => ({
    ...i,
    len: (i.value / Math.max(total, 1)) * C,
    start: shown.slice(0, idx).reduce((n, p) => n + (p.value / Math.max(total, 1)) * C, 0),
  }));
  if (total === 0) return <Empty icon="fa-chart-pie" title="Nothing to show" text="No data in this period." />;
  return (
    <div className={r.donutWrap}>
      <svg viewBox="0 0 150 150" width="150" height="150" role="img" aria-label={`${centerLabel}: ${items.map((i) => `${i.label} ${i.value}`).join(', ')}`}>
        <circle cx="75" cy="75" r={R} fill="none" stroke="#f1f4f9" strokeWidth={SW} />
        {segs.map((i) => (
          <circle key={i.key} cx="75" cy="75" r={R} fill="none" stroke={i.color} strokeWidth={hover === i.key ? SW + 4 : SW}
            strokeDasharray={`${Math.max(0, i.len - gap)} ${C - Math.max(0, i.len - gap)}`} strokeDashoffset={-i.start}
            className={r.sweep} transform="rotate(-90 75 75)" onMouseEnter={() => setHover(i.key)} onMouseLeave={() => setHover(null)}
            style={{ transition: 'stroke-width .12s ease', cursor: 'default', animationDelay: `${segs.indexOf(i) * 90}ms` }} />
        ))}
        <text x="75" y="76" textAnchor="middle" className={r.donutCenter}>{centerValue}</text>
        <text x="75" y="94" textAnchor="middle" className={r.donutSub}>{centerLabel}</text>
      </svg>
      <div className={r.legend}>
        {items.map((i) => (
          <div key={i.key} className={r.legendItem} onMouseEnter={() => setHover(i.key)} onMouseLeave={() => setHover(null)}
            style={{ opacity: hover && hover !== i.key ? 0.55 : 1 }}>
            <span className={r.swatch} style={{ background: i.color }} />
            <span className={r.legendName}>{i.label}</span>
            <b>{i.display ?? i.value}<em>{Math.round((i.value / total) * 100)}%</em></b>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- horizontal bars

export function Bars({ rows, empty }: {
  rows: { key: string | number; label: string; value: number; display: string; color?: string }[];
  empty: string;
}) {
  const max = Math.max(...rows.map((x) => x.value), 0);
  if (rows.length === 0 || max === 0) return <Empty icon="fa-chart-bar" title="Nothing yet" text={empty} />;
  return (
    <div className={r.hbars}>
      {rows.map((x) => (
        <div key={x.key} className={r.hbar}>
          <div className={r.hbarHead}><strong title={x.label}>{x.label}</strong><span>{x.display}</span></div>
          <div className={r.track} aria-hidden>
            <div className={`${r.fill} ${r.growX}`} style={{ width: `${Math.max(2, (x.value / max) * 100)}%`, background: `linear-gradient(90deg, ${x.color || SERIES[0]}b3, ${x.color || SERIES[0]})` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- column comparison

/** Vertical bars comparing entities on one measure, each in its own colour, values labelled on top. */
export function Columns({ rows, format }: {
  rows: { key: string | number; label: string; value: number; color: string }[];
  format: (v: number) => string;
}) {
  const W = 520;
  const H = 230;
  const pad = { l: 8, r: 8, t: 26, b: 36 };
  const max = niceMax(Math.max(...rows.map((x) => x.value), 0));
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const step = iw / Math.max(rows.length, 1);
  const bw = Math.min(56, step * 0.56);
  if (rows.every((x) => x.value === 0)) return <Empty icon="fa-chart-column" title="Nothing yet" text="No earnings in this period." />;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={r.chart} role="img" aria-label={rows.map((x) => `${x.label} ${format(x.value)}`).join(', ')}>
      <line className={r.base} x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} />
      {rows.map((x, i) => {
        const h = (x.value / max) * ih;
        const cx = pad.l + i * step + step / 2;
        const top = pad.t + ih - h;
        const rr = Math.min(6, bw / 2, h);
        return (
          <g key={x.key}>
            {h > 0 && (
              <path className={r.growY} style={{ animationDelay: `${i * 70}ms` }} fill={x.color}
                d={`M${cx - bw / 2},${pad.t + ih} V${top + rr} Q${cx - bw / 2},${top} ${cx - bw / 2 + rr},${top} H${cx + bw / 2 - rr} Q${cx + bw / 2},${top} ${cx + bw / 2},${top + rr} V${pad.t + ih} Z`} />
            )}
            <text x={cx} y={top - 8} textAnchor="middle" style={{ fontSize: 12, fontWeight: 700, fill: '#0f1b33' }}>{format(x.value)}</text>
            <text x={cx} y={H - 14} textAnchor="middle" className={r.axis} style={{ fontSize: 12 }}>
              {x.label.length > 14 ? `${x.label.slice(0, 13)}…` : x.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------- heatmap

const RAMP = ['#e8f0fc', '#b7d3f6', '#86b6ef', '#5598e7', '#2a78d6', '#1c5cab'];

export function Heatmap({ cells }: { cells: { weekday: number; hour: number; bookings: number }[] }) {
  const used = cells.filter((c) => c.bookings > 0);
  if (used.length === 0) return <Empty icon="fa-clock" title="No busy times yet" text="Bookings in this period will fill this map." />;
  const minH = Math.min(...used.map((c) => c.hour), 9);
  const maxH = Math.max(...used.map((c) => c.hour), 20);
  const hours = Array.from({ length: maxH - minH + 1 }, (_, i) => minH + i);
  const max = Math.max(...used.map((c) => c.bookings));
  const get = (d: number, h: number) => cells.find((c) => c.weekday === d && c.hour === h)?.bookings || 0;
  const shade = (v: number) => (v === 0 ? '#f3f6fb' : RAMP[Math.min(RAMP.length - 1, Math.max(1, Math.ceil((v / max) * (RAMP.length - 1))))]);
  const hl = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`;
  const busiest = [...used].sort((a, b) => b.bookings - a.bookings)[0];

  return (
    <div>
      <div className={r.heatScroll}>
        <div className={r.heat} style={{ ['--cols' as string]: hours.length }} role="table" aria-label="Bookings by weekday and starting hour">
          <span />
          {hours.map((h) => <span key={h} style={{ textAlign: 'center' }}>{h % 2 === 0 ? hl(h).replace('m', '') : ''}</span>)}
          {WEEKDAYS.map((name, di) => (
            <div key={name} style={{ display: 'contents' }} role="row">
              <span role="rowheader" style={{ fontWeight: 600 }}>{name}</span>
              {hours.map((h) => {
                const v = get(di + 1, h);
                return (
                  <span key={h} role="cell" className={r.heatCell} style={{ background: shade(v) }}
                    title={`${name} ${hl(h)}: ${v} booking${v === 1 ? '' : 's'}`} aria-label={`${name} ${hl(h)}: ${v} bookings`} />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className={r.heatScale}>
        Quiet {RAMP.map((c) => <i key={c} style={{ background: c }} />)} Busy
        {busiest && <span className={r.callout}><i className="fa-solid fa-fire" aria-hidden /> Peak: {WEEKDAYS[busiest.weekday - 1]} {hl(busiest.hour)}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- bits

export function Card({ title, icon, color = SERIES[0], subtitle, action, children }: {
  title: string;
  icon: string;
  color?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={r.card} style={tone(color)}>
      <div className={r.cardHead}>
        <div>
          <h2><i className={`fa-solid ${icon}`} aria-hidden />{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className={r.cardBody}>{children}</div>
    </section>
  );
}

export function Empty({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className={r.empty}>
      <i className={`fa-solid ${icon}`} aria-hidden />
      <strong>{title}</strong>
      {text}
    </div>
  );
}

export function StatLine({ icon, color, label, value }: { icon: string; color: string; label: string; value: string }) {
  return (
    <div className={r.statLine}>
      <span className={r.dotIcon} style={tone(color)}><i className={`fa-solid ${icon}`} aria-hidden /></span>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

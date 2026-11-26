'use client';

import { useState } from 'react';
import ReportsShell, { Loading, useReport } from '@/components/reports/ReportsShell';
import { Bars, Card, Columns, Empty, KpiCard, SERIES, STATUS_COLOR, colorFor, initials } from '@/components/reports/charts';
import { compact, filtersToApi, full, type StaffRow, type Team } from '@/lib/insights';
import r from '@/components/reports/reports.module.css';

type SortKey = 'earned' | 'bookings' | 'completed' | 'bookedHours' | 'customers' | 'noShowRate' | 'rating';

const COLS: { key: SortKey; label: string }[] = [
  { key: 'earned', label: 'Earned' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'completed', label: 'Completed' },
  { key: 'bookedHours', label: 'Hours' },
  { key: 'customers', label: 'Customers' },
  { key: 'noShowRate', label: 'No-shows' },
  { key: 'rating', label: 'Rating' },
];

function noShowPill(rate: number) {
  if (rate >= 15) return r.pillBad;
  if (rate >= 5) return r.pillWarn;
  return r.pillGood;
}

function Report({ api, currency, staffOrder }: { api: string; currency: string; staffOrder: number[] }) {
  const { data, error, loading } = useReport<Team>('/api/business/insights/team', api);
  const [sort, setSort] = useState<SortKey>('earned');
  const [open, setOpen] = useState<number | null>(null);

  if (error) return <div className={r.error} role="alert">{error}</div>;
  if (!data) return <Loading />;

  const order = staffOrder.length ? staffOrder : data.staff.map((s) => s.id);
  const rows = [...data.staff].sort((a, b) => Number(b[sort] ?? -1) - Number(a[sort] ?? -1));
  const busiest = [...data.staff].sort((a, b) => b.bookings - a.bookings)[0];
  const best = [...data.staff].filter((s) => s.rating).sort((a, b) => Number(b.rating) - Number(a.rating))[0];
  const totalBookings = data.staff.reduce((n, s) => n + s.bookings, 0);
  const totalHours = data.staff.reduce((n, s) => n + Number(s.bookedHours), 0);
  const selected: StaffRow | undefined = data.staff.find((s) => s.id === open);
  const byEntity = [...data.staff].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  return (
    <div style={{ display: 'grid', gap: 18, opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }}>
      <div className={r.kpis}>
        <KpiCard label="Team earned" icon="fa-sack-dollar" color={SERIES[0]} value={full(data.totalEarned, currency)} sub={`${data.staff.length} staff members`} />
        <KpiCard label="Bookings handled" icon="fa-calendar-check" color={SERIES[2]} value={full(totalBookings)} sub={`${totalHours.toFixed(1)} hours of chair time`} />
        <KpiCard label="Busiest" icon="fa-bolt" color={SERIES[1]} value={busiest?.bookings ? busiest.name : '—'}
          sub={busiest?.bookings ? `${busiest.bookings} bookings` : 'No bookings yet'} />
        <KpiCard label="Best rated" icon="fa-star" color={SERIES[3]} value={best ? best.name : '—'}
          sub={best ? `${best.rating} average rating` : 'No reviews in this period'} />
      </div>

      <div className={r.row2even}>
        <Card title="Earnings by staff member" icon="fa-chart-column" color={SERIES[0]} subtitle="Price of each person's own services on completed bookings.">
          <Columns format={(v) => compact(v)} rows={byEntity.map((s) => ({ key: s.id, label: s.name, value: Number(s.earned), color: colorFor(s.id, order) }))} />
        </Card>
        <Card title="Bookings by staff member" icon="fa-calendar-days" color={SERIES[2]} subtitle="All bookings they are on, excluding cancellations.">
          <Bars empty="No bookings in this period."
            rows={byEntity.map((s) => ({ key: s.id, label: s.name, value: s.bookings, color: colorFor(s.id, order),
              display: `${s.bookings} · ${s.completed} completed` }))} />
        </Card>
      </div>

      <Card title="Staff performance" icon="fa-table" color={SERIES[0]} subtitle="Sort by any column. Select a person for their details.">
        {rows.length === 0 ? (
          <Empty icon="fa-user-tie" title="No staff yet" text="Add staff under Locations & team to see their numbers here." />
        ) : (
          <div className={r.tableWrap}>
            <table className={r.table}>
              <thead>
                <tr>
                  <th>Staff member</th>
                  {COLS.map((c) => (
                    <th key={c.key} className={r.num} aria-sort={sort === c.key ? 'descending' : 'none'}>
                      <button type="button" className={sort === c.key ? r.sortOn : ''} onClick={() => setSort(c.key)}>
                        {c.label} <i className={`fa-solid ${sort === c.key ? 'fa-arrow-down-wide-short' : 'fa-sort'}`} aria-hidden />
                      </button>
                    </th>
                  ))}
                  <th>Share of earnings</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const c = colorFor(s.id, order);
                  return (
                    <tr key={s.id} className={open === s.id ? r.rowOpen : ''} onClick={() => setOpen(open === s.id ? null : s.id)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className={r.person}>
                          <span className={r.avatar} style={{ ['--tone' as string]: c }}>{initials(s.name)}</span>
                          <div>
                            <button type="button" className={r.personName} style={{ all: 'unset', fontWeight: 700, cursor: 'pointer' }} aria-expanded={open === s.id}>{s.name}</button>
                            <div className={r.muted}>{[s.designation, s.branch].filter(Boolean).join(' · ')}{!s.active ? ' · inactive' : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className={r.num}><strong>{full(s.earned, currency)}</strong></td>
                      <td className={r.num}>{s.bookings}</td>
                      <td className={r.num}>{s.completed}</td>
                      <td className={r.num}>{s.bookedHours}</td>
                      <td className={r.num}>{s.customers}</td>
                      <td className={r.num}><span className={`${r.pill} ${noShowPill(Number(s.noShowRate))}`}>{s.noShows} · {s.noShowRate}%</span></td>
                      <td className={r.num}>{s.rating ? <><span className={r.stars}>★</span> <strong>{s.rating}</strong></> : <span className={r.muted}>—</span>}</td>
                      <td>
                        <div className={r.inlineBar}>
                          <div className={r.track}><div className={r.fill} style={{ width: `${s.share}%`, background: c }} /></div>
                          <strong style={{ minWidth: 44, textAlign: 'right' }}>{s.share}%</strong>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && (
        <Card title={selected.name} icon="fa-id-badge" color={colorFor(selected.id, order)}
          subtitle={[selected.designation, selected.branch].filter(Boolean).join(' · ')}
          action={<button type="button" className={r.reset} style={{ color: '#1d4ed8', borderColor: '#d6e2fb' }} onClick={() => setOpen(null)}>Close</button>}>
          <div className={r.kpis} style={{ marginBottom: 18 }}>
            <KpiCard label="Average per visit" icon="fa-receipt" color={SERIES[1]} value={full(selected.averageValue, currency)} />
            <KpiCard label="Upcoming" icon="fa-calendar" color={SERIES[0]} value={String(selected.upcoming)} />
            <KpiCard label="Customers served" icon="fa-users" color={SERIES[4]} value={String(selected.customers)} />
            <KpiCard label="Most booked service" icon="fa-scissors" color={SERIES[2]} value={selected.topService || '—'} />
          </div>
          <Bars empty="No bookings in this period."
            rows={[
              { key: 'c', label: 'Completed', value: selected.completed, display: String(selected.completed), color: STATUS_COLOR.COMPLETED },
              { key: 'u', label: 'Upcoming', value: selected.upcoming, display: String(selected.upcoming), color: STATUS_COLOR.CONFIRMED },
              { key: 'n', label: 'No-show', value: selected.noShows, display: String(selected.noShows), color: STATUS_COLOR.NO_SHOW },
              { key: 'x', label: 'Cancelled', value: selected.cancelled, display: String(selected.cancelled), color: STATUS_COLOR.CANCELLED },
            ]} />
        </Card>
      )}
    </div>
  );
}

export default function TeamReportPage() {
  return (
    <ReportsShell report="team" title="Team" subtitle="Each staff member's earnings, bookings, hours, no-shows and ratings.">
      {(f, options) => <Report api={filtersToApi(f)} currency={options?.currency || 'PKR'} staffOrder={(options?.staff || []).map((s) => s.id)} />}
    </ReportsShell>
  );
}

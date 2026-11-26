'use client';

import { useState } from 'react';
import ReportsShell, { Loading, useReport } from '@/components/reports/ReportsShell';
import { AreaTrend, Bars, Card, Donut, Heatmap, KpiCard, SERIES, STATUS_COLOR, StatLine } from '@/components/reports/charts';
import { STATUS_LABEL, filtersToApi, full, type Overview } from '@/lib/insights';
import { methodLabel } from '@/lib/payments';
import r from '@/components/reports/reports.module.css';

const STATUS_ORDER = ['COMPLETED', 'CONFIRMED', 'IN_PROGRESS', 'PENDING', 'RESCHEDULED', 'NO_SHOW', 'CANCELLED', 'REJECTED'];

function Report({ api, currency }: { api: string; currency: string }) {
  const { data, error, loading } = useReport<Overview>('/api/business/insights/overview', api);
  const [metric, setMetric] = useState<'earned' | 'bookings'>('earned');

  if (error) return <div className={r.error} role="alert">{error}</div>;
  if (!data) return <Loading />;

  const k = data.kpis;
  const p = data.previous;
  const outstanding = Math.max(0, Number(k.earned) - Number(k.collected));
  const trend = data.trend;
  const sum = (key: 'earned' | 'bookings') => trend.reduce((n, t) => n + Number(t[key] || 0), 0);
  const best = [...trend].sort((a, b) => Number(b[metric]) - Number(a[metric]))[0];
  const statuses = [...data.status].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));

  return (
    <div style={{ display: 'grid', gap: 18, opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }}>
      <div className={r.kpis}>
        <KpiCard label="Earned" icon="fa-sack-dollar" color={SERIES[0]} value={full(k.earned, currency)} now={k.earned} before={p.earned}
          spark={trend.map((t) => Number(t.earned))} />
        <KpiCard label="Bookings" icon="fa-calendar-check" color={SERIES[2]} value={full(k.bookings)} now={k.bookings} before={p.bookings}
          spark={trend.map((t) => Number(t.bookings))} />
        <KpiCard label="Average per visit" icon="fa-receipt" color={SERIES[1]} value={full(k.averageValue, currency)} now={k.averageValue} before={p.averageValue} />
        <KpiCard label="Customers" icon="fa-users" color={SERIES[4]} value={full(k.customers)} now={k.customers} before={p.customers}
          sub={`${k.newCustomers} new · ${k.returningCustomers} returning`} />
        <KpiCard label="Completed visits" icon="fa-circle-check" color={STATUS_COLOR.COMPLETED} value={full(k.completed)} now={k.completed} before={p.completed}
          spark={trend.map((t) => Number(t.completed))} />
        <KpiCard label="No-show rate" icon="fa-user-xmark" color={STATUS_COLOR.NO_SHOW} value={`${k.noShowRate}%`} now={k.noShowRate} before={p.noShowRate} invert
          sub={`${k.noShows} no-show${k.noShows === 1 ? '' : 's'}`} />
        <KpiCard label="Cancellation rate" icon="fa-ban" color={SERIES[3]} value={`${k.cancellationRate}%`} now={k.cancellationRate} before={p.cancellationRate} invert
          sub={`${k.cancelled} cancelled booking${k.cancelled === 1 ? '' : 's'}`} />
        <KpiCard label="Chair time booked" icon="fa-hourglass-half" color={SERIES[0]} value={`${k.bookedHours} h`} now={k.bookedHours} before={p.bookedHours}
          sub={`Booked ${k.leadDays} days ahead on average`} />
      </div>

      <div className={r.row2}>
        <Card title={metric === 'earned' ? 'Earnings over time' : 'Bookings over time'} icon="fa-chart-area" color={metric === 'earned' ? SERIES[0] : SERIES[2]}
          subtitle={`By ${data.bucket}. Hover the chart for details.`}
          action={
            <div className={r.seg} role="group" aria-label="Measure">
              <button type="button" className={metric === 'earned' ? r.segOn : ''} aria-pressed={metric === 'earned'} onClick={() => setMetric('earned')}>Earnings</button>
              <button type="button" className={metric === 'bookings' ? r.segOn : ''} aria-pressed={metric === 'bookings'} onClick={() => setMetric('bookings')}>Bookings</button>
            </div>
          }>
          <div className={r.chartStats}>
            <div><span>Total</span><strong>{metric === 'earned' ? full(sum('earned'), currency) : full(sum('bookings'))}</strong></div>
            <div><span>Per {data.bucket}</span><strong>{metric === 'earned' ? full(sum('earned') / Math.max(1, trend.length), currency) : (sum('bookings') / Math.max(1, trend.length)).toFixed(1)}</strong></div>
            {best && Number(best[metric]) > 0 && (
              <div><span>Best {data.bucket}</span><strong>{new Date(`${best.period}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</strong></div>
            )}
          </div>
          <AreaTrend data={trend} metric={metric} bucket={data.bucket} currency={currency} />
        </Card>

        <Card title="Booking outcomes" icon="fa-chart-pie" color={STATUS_COLOR.COMPLETED} subtitle="How every booking in the period ended or stands.">
          <Donut centerValue={String(k.bookings)} centerLabel="Bookings"
            items={statuses.map((st) => ({ key: st.status, label: STATUS_LABEL[st.status] || st.status, value: Number(st.count), color: STATUS_COLOR[st.status] || '#8a94a6' }))} />
        </Card>
      </div>

      <div className={r.row3}>
        <Card title="Money" icon="fa-wallet" color={SERIES[0]} subtitle="Customers pay you directly; this is what you have recorded.">
          <div className={r.statList}>
            <StatLine icon="fa-calendar" color={SERIES[0]} label="Booked value" value={full(k.bookedValue, currency)} />
            <StatLine icon="fa-circle-check" color={STATUS_COLOR.COMPLETED} label="Earned from completed visits" value={full(k.earned, currency)} />
            <StatLine icon="fa-hand-holding-dollar" color={SERIES[2]} label="Payments confirmed" value={full(k.collected, currency)} />
            <StatLine icon="fa-triangle-exclamation" color={SERIES[3]} label="Earned, not marked paid" value={full(outstanding, currency)} />
          </div>
        </Card>

        <Card title="Payment methods" icon="fa-credit-card" color={SERIES[1]} subtitle="Confirmed payments by how customers paid.">
          <Donut centerValue={String(data.paymentMethods.reduce((n, m) => n + Number(m.payments), 0))} centerLabel="Payments"
            items={data.paymentMethods.map((m, i) => ({ key: m.method, label: methodLabel(m.method), value: Number(m.amount), color: SERIES[i % SERIES.length], display: full(m.amount, currency) }))} />
        </Card>

        <Card title="Walk-ins" icon="fa-people-line" color={SERIES[4]} subtitle="Customers who joined the queue in person.">
          <div className={r.statList}>
            <StatLine icon="fa-user-plus" color={SERIES[4]} label="Joined the queue" value={String(data.walkIns.total)} />
            <StatLine icon="fa-check" color={STATUS_COLOR.COMPLETED} label="Served" value={String(data.walkIns.served)} />
            <StatLine icon="fa-stopwatch" color={SERIES[3]} label="Average wait to be called" value={`${Math.round(Number(data.walkIns.avgWait))} min`} />
            <StatLine icon="fa-user-group" color={SERIES[0]} label="New customers (bookings)" value={String(k.newCustomers)} />
          </div>
        </Card>
      </div>

      <div className={data.branches.length > 1 ? r.row2 : ''}>
        <Card title="Busy times" icon="fa-fire" color={SERIES[1]} subtitle="Bookings by day and starting hour. Plan staff and quiet-hour offers around it.">
          <Heatmap cells={data.heatmap} />
        </Card>
        {data.branches.length > 1 && (
          <Card title="Branches" icon="fa-store" color={SERIES[2]} subtitle="Earnings per branch, with bookings and no-shows.">
            <Bars empty="No bookings in this period."
              rows={data.branches.map((b, i) => ({ key: b.id, label: b.name, value: Number(b.earned), color: SERIES[i % SERIES.length],
                display: `${full(b.earned, currency)} · ${b.bookings} bookings · ${b.noShows} no-shows` }))} />
          </Card>
        )}
      </div>

      <p className={r.foot}>
        Compared with {new Date(`${data.period.previousFrom}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} to{' '}
        {new Date(`${data.period.previousTo}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.
      </p>
    </div>
  );
}

export default function PerformanceReportPage() {
  return (
    <ReportsShell report="performance" title="Performance" subtitle="Money, bookings, outcomes and busy times across your business.">
      {(f, options) => <Report api={filtersToApi(f)} currency={options?.currency || 'PKR'} />}
    </ReportsShell>
  );
}

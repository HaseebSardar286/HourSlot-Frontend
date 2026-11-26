'use client';

import ReportsShell, { Loading, useReport } from '@/components/reports/ReportsShell';
import { Bars, Card, Donut, Empty, KpiCard, SERIES, colorFor, initials } from '@/components/reports/charts';
import { filtersToApi, full, type CustomersReport } from '@/lib/insights';
import { dateLabel } from '@/lib/payments';
import r from '@/components/reports/reports.module.css';

// Stars ramp: one hue (amber), darker = more stars.
const STAR_COLORS: Record<number, string> = { 5: '#c98500', 4: '#eda100', 3: '#f5c04d', 2: '#f8d585', 1: '#fbe7b8' };

function Report({ api, currency, serviceOrder }: { api: string; currency: string; serviceOrder: number[] }) {
  const { data, error, loading } = useReport<CustomersReport>('/api/business/insights/customers', api);

  if (error) return <div className={r.error} role="alert">{error}</div>;
  if (!data) return <Loading />;

  const k = data.kpis;
  const order = serviceOrder.length ? serviceOrder : data.services.map((s) => s.id);
  const totalReviews = data.ratings.reduce((n, x) => n + Number(x.count), 0);
  const maxEarned = Math.max(...data.services.map((s) => Number(s.earned)), 1);
  const servicesByEntity = [...data.services].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  return (
    <div style={{ display: 'grid', gap: 18, opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }}>
      <div className={r.kpis}>
        <KpiCard label="Customers" icon="fa-users" color={SERIES[0]} value={full(k.customers)} sub={`${k.newCustomers} new · ${k.returningCustomers} returning`} />
        <KpiCard label="Came back more than once" icon="fa-rotate" color={SERIES[2]} value={`${data.repeatRate}%`} sub={`${data.averageVisits} completed visits per customer`} />
        <KpiCard label="Average per visit" icon="fa-receipt" color={SERIES[1]} value={full(k.averageValue, currency)} />
        <KpiCard label="Rating" icon="fa-star" color={SERIES[3]} value={k.reviews ? `★ ${k.rating}` : '—'} sub={`${k.reviews} reviews`} />
      </div>

      <div>
        <Card title="Services" icon="fa-scissors" color={SERIES[0]} subtitle="What sells, what earns and what gets cancelled.">
          <div className={r.tableWrap}>
            <table className={r.table}>
              <thead>
                <tr>
                  <th>Service</th><th className={r.num}>List price</th><th className={r.num}>Bookings</th><th className={r.num}>Completed</th>
                  <th className={r.num}>Cancelled</th><th className={r.num}>Customers</th><th>Earned</th>
                </tr>
              </thead>
              <tbody>
                {data.services.map((sv) => {
                  const c = colorFor(sv.id, order);
                  return (
                    <tr key={sv.id}>
                      <td><div className={r.person}><span className={r.swatch} style={{ background: c }} /><strong>{sv.name}</strong></div></td>
                      <td className={r.num}>{full(sv.listPrice, currency)}</td>
                      <td className={r.num}>{sv.bookings}</td>
                      <td className={r.num}>{sv.completed}</td>
                      <td className={r.num}>{sv.cancelled ? <span className={`${r.pill} ${r.pillWarn}`}>{sv.cancelled}</span> : <span className={r.muted}>0</span>}</td>
                      <td className={r.num}>{sv.customers}</td>
                      <td>
                        <div className={r.inlineBar}>
                          <div className={r.track}><div className={r.fill} style={{ width: `${(Number(sv.earned) / maxEarned) * 100}%`, background: c }} /></div>
                          <strong style={{ minWidth: 90, textAlign: 'right' }}>{full(sv.earned, currency)}</strong>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className={r.row2even}>
        <Card title="Top customers" icon="fa-crown" color={SERIES[3]} subtitle="By spend on completed visits in the period.">
          {data.topCustomers.length === 0 ? (
            <Empty icon="fa-users" title="No customers yet" text="Nobody booked in this period." />
          ) : (
            <div className={r.list}>
              {data.topCustomers.map((c, i) => (
                <div key={c.id} className={r.listRow}>
                  <span className={`${r.rank} ${i === 0 ? r.rank1 : i === 1 ? r.rank2 : i === 2 ? r.rank3 : ''}`}>{i + 1}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className={r.listTitle}>{c.name || c.email}</div>
                    <div className={r.listMeta}>{c.visits} visit{c.visits === 1 ? '' : 's'}{c.noShows ? ` · ${c.noShows} no-shows` : ''} · last {dateLabel(c.lastVisit)}</div>
                  </div>
                  <span className={r.amount}>{full(c.spend, currency)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Regulars you might lose" icon="fa-heart-crack" color="#d03b3b" subtitle="Visited before, nothing in 60+ days and nothing booked. Worth a message.">
          {data.atRisk.length === 0 ? (
            <Empty icon="fa-heart" title="Nobody at risk" text="Every past customer has visited recently or has a booking." />
          ) : (
            <div className={r.list}>
              {data.atRisk.map((c) => (
                <div key={c.id} className={r.listRow}>
                  <span className={r.avatar} style={{ ['--tone' as string]: '#ec835a' }}>{initials(c.name || c.email)}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className={r.listTitle}>{c.name || c.email}</div>
                    <div className={r.listMeta}>{c.visits} visit{c.visits === 1 ? '' : 's'} · last {dateLabel(c.lastVisit)}{c.phone ? ` · ${c.phone}` : ''}</div>
                  </div>
                  <span className={`${r.pill} ${r.pillBad}`}>{full(c.spend, currency)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className={r.row2even}>
        <Card title="Service mix" icon="fa-chart-pie" color={SERIES[1]} subtitle="Share of bookings in the period.">
          <Donut centerValue={String(data.services.reduce((n, s) => n + s.bookings, 0))} centerLabel="Bookings"
            items={servicesByEntity.map((s) => ({ key: String(s.id), label: s.name, value: s.bookings, color: colorFor(s.id, order) }))} />
        </Card>
        <Card title="Ratings" icon="fa-star-half-stroke" color={SERIES[3]} subtitle="Stars from reviews on bookings in this period.">
          <Bars empty="No reviews in this period."
            rows={data.ratings.map((x) => ({ key: x.stars, label: `${'★'.repeat(x.stars)}  ${x.stars} star${x.stars === 1 ? '' : 's'}`, value: Number(x.count),
              color: STAR_COLORS[x.stars], display: `${x.count}${totalReviews ? ` · ${Math.round((Number(x.count) / totalReviews) * 100)}%` : ''}` }))} />
        </Card>
      </div>
      <Card title="Latest reviews" icon="fa-comment-dots" color={SERIES[4]} subtitle="Reply to reviews from your business profile.">
          {data.latestReviews.length === 0 ? (
            <Empty icon="fa-comment" title="No reviews yet" text="Reviews appear after customers rate completed visits." />
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {data.latestReviews.map((x) => (
                <div key={x.id} className={r.review}>
                  <div className={r.reviewHead}>
                    <span className={r.stars}>{'★'.repeat(x.rating)}</span><strong>{x.customer}</strong><span>{dateLabel(x.createdAt)}</span>
                    {!x.replied && <span className={`${r.pill} ${r.pillWarn}`}>No reply yet</span>}
                  </div>
                  {x.comment && <p>{x.comment}</p>}
                </div>
              ))}
            </div>
          )}
      </Card>
    </div>
  );
}

export default function CustomersReportPage() {
  return (
    <ReportsShell report="customers" title="Customers & services" subtitle="What sells, who comes back, who has gone quiet and what people say.">
      {(f, options) => <Report api={filtersToApi(f)} currency={options?.currency || 'PKR'} serviceOrder={(options?.services || []).map((s) => s.id)} />}
    </ReportsShell>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Dropdown from '@/components/ui/Dropdown';
import DateRangePicker from '@/components/ui/DateRangePicker';
import { MonthPicker } from '@/components/ui/DatePicker';
import { avatarColor, dayLabel, downloadFile, errMsg, initials, money, periodPresets, todayIso, type Me } from '@/lib/ops';
import Dialog from './Dialog';
import OpsHero, { Kpi, Notice } from './OpsHero';
import s from './ops.module.css';

type Rule = { id: number; staff_id: number | null; staff_name?: string; service_id: number | null; service_name?: string; percent: number };
type PayPerson = { staffId: number; name: string; services: number; revenue: number; commission: number; tips: number; hours: number; payout: number };
type Pay = { from: string; to: string; currency: string; totals: { revenue: number; commission: number; tips: number; payout: number }; people: PayPerson[]; rules: Rule[]; hasRules: boolean };
type Target = { staffId: number; name: string; revenueTarget?: number; bookingsTarget?: number; revenue: number; bookings: number; rating?: number; reviews: number; revenuePct?: number; bookingsPct?: number; onTrack?: boolean };
type Targets = { month: string; monthElapsedPct: number; currency: string; staff: Target[] };

/** Commission rules, the pay summary for a period (with Excel export) and monthly targets. Owner only. */
export default function TeamPay() {
  const presets = periodPresets();
  const [range, setRange] = useState({ from: presets[3].from, to: presets[3].to, preset: 'month' });
  const [pay, setPay] = useState<Pay | null>(null);
  const [month, setMonth] = useState(todayIso().slice(0, 7));
  const [targets, setTargets] = useState<Targets | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [services, setServices] = useState<{ id: number; name: string }[]>([]);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [targetFor, setTargetFor] = useState<Target | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const loadPay = useCallback(async () => {
    try { setPay(await apiFetch<Pay>(`/api/staff-ops/pay?from=${range.from}&to=${range.to}`)); } catch (e) { setError(errMsg(e)); }
  }, [range]);
  const loadTargets = useCallback(async () => {
    try { setTargets(await apiFetch<Targets>(`/api/staff-ops/targets?month=${month}`)); } catch (e) { setError(errMsg(e)); }
  }, [month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPay();
  }, [loadPay]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTargets();
  }, [loadTargets]);
  useEffect(() => {
    apiFetch<Me>('/api/front-desk/me').then(setMe).catch(() => null);
    apiFetch<{ id: number; name: string }[]>('/api/business/services').then(setServices).catch(() => setServices([]));
  }, []);

  const cur = pay?.currency || 'PKR';
  const exportXlsx = async () => {
    setBusy(true);
    try { await downloadFile(`/api/staff-ops/pay/export?from=${range.from}&to=${range.to}`, 'duemet-staff-pay.xlsx'); }
    catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  };
  const removeRule = async (id: number) => {
    try { await apiFetch(`/api/staff-ops/commission/${id}`, { method: 'DELETE' }); void loadPay(); } catch (e) { setError(errMsg(e)); }
  };
  const ruleLabel = (r: Rule) => r.staff_id == null && r.service_id == null ? 'Everyone, every service (default)'
    : `${r.staff_name || 'Everyone'} · ${r.service_name || 'every service'}`;

  return (
    <div className={s.page}>
      <OpsHero eyebrow="Team · Commission & pay" title="Commission & pay"
        text="Commission on finished visits plus tips, with hours from the time clock. Download it for payroll."
        actions={<button type="button" className={s.whiteBtn} onClick={exportXlsx} disabled={busy}><i className={`fa-solid ${busy ? 'fa-spinner fa-spin' : 'fa-file-excel'}`} style={{ color: '#107c41' }} /> Download Excel</button>}>
        <div style={{ width: 300 }}>
          <DateRangePicker from={range.from} to={range.to} preset={range.preset} presets={presets} onChange={setRange} />
        </div>
      </OpsHero>

      <Notice error={error} ok={ok} />

      <div className={s.kpis}>
        <Kpi label="Revenue from finished visits" value={money(pay?.totals.revenue, cur)} icon="fa-sack-dollar" tone={s.tBlue} sub={`${dayLabel(range.from)} – ${dayLabel(range.to)}`} />
        <Kpi label="Commission" value={money(pay?.totals.commission, cur)} icon="fa-percent" tone={s.tViolet} sub={pay?.hasRules ? 'from your rules' : 'no rules yet'} />
        <Kpi label="Tips" value={money(pay?.totals.tips, cur)} icon="fa-hand-holding-dollar" tone={s.tGreen} sub="recorded at the front desk" />
        <Kpi label="Total to pay" value={money(pay?.totals.payout, cur)} icon="fa-wallet" tone={s.tAmber} sub="commission + tips" />
      </div>

      <div className={s.grid2} style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)' }}>
        <section className={s.panel}>
          <div className={s.panelHead}><div><h2><i className="fa-solid fa-money-check-dollar" style={{ color: '#2563eb' }} /> Pay summary</h2><p>Salaries aren&apos;t included; add them in your payroll.</p></div></div>
          <div className={`${s.tableWrap} ${s.panelBody}`}>
            <table className={s.table}>
              <thead><tr><th>Team member</th><th className={s.num}>Visits</th><th className={s.num}>Revenue</th><th className={s.num}>Commission</th><th className={s.num}>Tips</th><th className={s.num}>Hours</th><th className={s.num}>Total</th></tr></thead>
              <tbody>
                {(pay?.people || []).map((p) => (
                  <tr key={p.staffId}>
                    <td><div className={s.tlWho}><span className={s.avatar} style={{ background: avatarColor(p.staffId) }}>{initials(p.name)}</span><span className={s.tlName}>{p.name}</span></div></td>
                    <td className={s.num}>{p.services}</td>
                    <td className={s.num}>{money(p.revenue, cur)}</td>
                    <td className={s.num}>{money(p.commission, cur)}</td>
                    <td className={s.num}>{money(p.tips, cur)}</td>
                    <td className={s.num}>{p.hours || '—'}</td>
                    <td className={`${s.num} ${s.strong}`}>{money(p.payout, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={s.panel}>
          <div className={s.panelHead}>
            <div><h2><i className="fa-solid fa-percent" style={{ color: '#6d4ae0' }} /> Commission rules</h2><p>The most specific rule wins.</p></div>
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setRuleOpen(true)}><i className="fa-solid fa-plus" /> Add rule</button>
          </div>
          <div className={s.panelBody} style={{ display: 'grid', gap: 8 }}>
            {(pay?.rules || []).length === 0 && <div className={s.empty}><i className="fa-solid fa-percent" /> No commission yet. Add a default rate, then special rates per person or service.</div>}
            {(pay?.rules || []).map((r) => (
              <div key={r.id} className={s.settingRow}>
                <div><strong>{Number(r.percent)}%</strong><span>{ruleLabel(r)}</span></div>
                <button type="button" className={`${s.btn} ${s.btnGhost} ${s.iconOnly}`} aria-label="Remove rule" onClick={() => removeRule(r.id)}><i className="fa-solid fa-trash" /></button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={s.panel}>
        <div className={s.panelHead}>
          <div><h2><i className="fa-solid fa-bullseye" style={{ color: '#0f9d58' }} /> Monthly targets</h2>
            <p>{targets ? `${targets.monthElapsedPct}% of the month has passed. Green is on track.` : ''}</p></div>
          <div style={{ width: 200 }}><MonthPicker value={month} onChange={setMonth} align="right" aria-label="Month" /></div>
        </div>
        <div className={`${s.tableWrap} ${s.panelBody}`}>
          <table className={s.table}>
            <thead><tr><th>Team member</th><th>Revenue</th><th className={s.num}>Target</th><th>Visits</th><th className={s.num}>Target</th><th className={s.num}>Rating</th><th /></tr></thead>
            <tbody>
              {(targets?.staff || []).map((t) => (
                <tr key={t.staffId}>
                  <td><div className={s.tlWho}><span className={s.avatar} style={{ background: avatarColor(t.staffId) }}>{initials(t.name)}</span><span className={s.tlName}>{t.name}</span></div></td>
                  <td>
                    <div className={s.strong}>{money(t.revenue, targets?.currency)}</div>
                    {t.revenuePct != null && <div className={`${s.progress} ${t.onTrack ? s.progressGood : s.progressBehind}`}><span style={{ width: `${Math.min(100, t.revenuePct)}%` }} /></div>}
                  </td>
                  <td className={s.num}>{t.revenueTarget ? `${money(t.revenueTarget, targets?.currency)} · ${t.revenuePct}%` : '—'}</td>
                  <td>
                    <div className={s.strong}>{t.bookings}</div>
                    {t.bookingsPct != null && <div className={`${s.progress} ${t.bookingsPct >= (targets?.monthElapsedPct || 0) - 5 ? s.progressGood : s.progressBehind}`}><span style={{ width: `${Math.min(100, t.bookingsPct)}%` }} /></div>}
                  </td>
                  <td className={s.num}>{t.bookingsTarget ? `${t.bookingsTarget} · ${t.bookingsPct}%` : '—'}</td>
                  <td className={s.num}>{t.rating ? <><i className="fa-solid fa-star" style={{ color: '#eda100' }} /> {Number(t.rating).toFixed(1)} <span className={s.muted}>({t.reviews})</span></> : '—'}</td>
                  <td className={s.num}><button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => setTargetFor(t)}>Set target</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {ruleOpen && me && (
        <RuleDialog me={me} services={services} onClose={() => setRuleOpen(false)} onSaved={() => { setRuleOpen(false); setOk('Commission rule saved.'); void loadPay(); }} />
      )}
      {targetFor && (
        <TargetDialog t={targetFor} month={month} currency={targets?.currency || 'PKR'} onClose={() => setTargetFor(null)}
          onSaved={() => { setTargetFor(null); setOk('Target saved.'); void loadTargets(); }} />
      )}
    </div>
  );
}

function RuleDialog({ me, services, onClose, onSaved }: { me: Me; services: { id: number; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const [staffId, setStaffId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [percent, setPercent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    try {
      await apiFetch('/api/staff-ops/commission', { method: 'PUT', body: JSON.stringify({ staffId: staffId ? Number(staffId) : null, serviceId: serviceId ? Number(serviceId) : null, percent: Number(percent) }) });
      onSaved();
    } catch (e) { setError(errMsg(e)); }
  };
  return (
    <Dialog title="Commission rule" sub="Leave both as 'Everyone' to set the default rate." onClose={onClose}
      footer={<button type="button" className={`${s.btn} ${s.btnLg} ${s.btnPrimary}`} disabled={percent === ''} onClick={save}>Save rule</button>}>
      <div className={s.fields}>
        <div className={s.field}><span className={s.label}>Team member</span>
          <Dropdown aria-label="Team member" value={staffId} onChange={setStaffId} icon="fa-user" options={[{ value: '', label: 'Everyone' }, ...me.staff.map((m) => ({ value: String(m.id), label: m.name }))]} /></div>
        <div className={s.field}><span className={s.label}>Service</span>
          <Dropdown aria-label="Service" value={serviceId} onChange={setServiceId} icon="fa-tag" options={[{ value: '', label: 'Every service' }, ...services.map((sv) => ({ value: String(sv.id), label: sv.name }))]} /></div>
        <label className={`${s.field} ${s.fieldFull}`}><span className={s.label}>Commission %</span>
          <input className={s.input} type="number" min={0} max={100} step={0.5} value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="e.g. 30" /></label>
      </div>
      {error && <div className={s.err}>{error}</div>}
    </Dialog>
  );
}

function TargetDialog({ t, month, currency, onClose, onSaved }: { t: Target; month: string; currency: string; onClose: () => void; onSaved: () => void }) {
  const [rev, setRev] = useState(t.revenueTarget ? String(t.revenueTarget) : '');
  const [bk, setBk] = useState(t.bookingsTarget ? String(t.bookingsTarget) : '');
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    try {
      await apiFetch('/api/staff-ops/targets', { method: 'PUT', body: JSON.stringify({ staffId: t.staffId, month, revenueTarget: rev ? Number(rev) : null, bookingsTarget: bk ? Number(bk) : null }) });
      onSaved();
    } catch (e) { setError(errMsg(e)); }
  };
  return (
    <Dialog title={`Target for ${t.name}`} sub={new Date(`${month}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} onClose={onClose}
      footer={<button type="button" className={`${s.btn} ${s.btnLg} ${s.btnPrimary}`} onClick={save}>Save target</button>}>
      <div className={s.fields}>
        <label className={s.field}><span className={s.label}>Revenue ({currency})</span><input className={s.input} type="number" min={0} value={rev} onChange={(e) => setRev(e.target.value)} /></label>
        <label className={s.field}><span className={s.label}>Finished visits</span><input className={s.input} type="number" min={0} value={bk} onChange={(e) => setBk(e.target.value)} /></label>
      </div>
      {error && <div className={s.err}>{error}</div>}
    </Dialog>
  );
}

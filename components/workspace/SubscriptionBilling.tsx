'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
  INVOICE_STATUS, billNumber, METHOD_LABEL, dateLabel, money,
  type BillingOverview, type Invoice, type Payee,
} from '@/lib/payments';
import Dropdown from '@/components/ui/Dropdown';
import PlanPayModal, { type PlanPayment } from './PlanPayModal';
import s from './tools.module.css';

const TONE = { amber: s.chipAmber, blue: s.chipBlue, green: s.chipGreen, slate: s.chipSlate } as const;

function errText(e: unknown, fallback: string) {
  return (e as { message?: string })?.message || fallback;
}

export function PayeeDetails({ payee }: { payee?: Payee }) {
  if (!payee?.configured) {
    return (
      <p className={s.hint}>
        Duemet&apos;s account details are being set up. Open a support ticket and we&apos;ll send them to you.
      </p>
    );
  }
  const rows: [string, string | null | undefined][] = [
    ['Account title', payee.accountTitle],
    ['Bank', payee.bankName],
    ['Account number', payee.accountNumber],
    ['IBAN', payee.iban],
    ['JazzCash', payee.jazzcash],
    ['Easypaisa', payee.easypaisa],
  ];
  return (
    <div className={s.stack}>
      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', margin: 0 }}>
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} style={{ display: 'contents' }}>
            <dt className={s.hint}>{k}</dt>
            <dd style={{ margin: 0 }}><strong className={s.code}>{v}</strong></dd>
          </div>
        ))}
      </dl>
      {payee.instructions && <p className={s.hint}>{payee.instructions}</p>}
    </div>
  );
}

/** The owner's plan, Duemet's account details, open invoice and history. Money goes straight to Duemet. */
export default function SubscriptionBilling() {
  const [data, setData] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [months, setMonths] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState<PlanPayment | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<BillingOverview>('/api/workspace/billing'));
      setError(null);
    } catch (e) {
      setError(errText(e, 'Could not load billing.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    void load();
  }, [load]);

  // Back from Safepay: say what happens next, and refresh while Safepay's confirmation arrives.
  useEffect(() => {
    const url = new URL(window.location.href);
    const card = url.searchParams.get('card');
    if (!card) return;
    url.searchParams.delete('card');
    window.history.replaceState(null, '', url.toString());
    if (card === 'cancelled') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off message from the redirect
      setNotice('Card payment was cancelled. Nothing was charged.');
      return;
    }
    setNotice('Card approved. Your plan switches on as soon as Safepay confirms the payment, usually within a minute.');
    let n = 0;
    const t = window.setInterval(() => {
      n += 1;
      void load();
      if (n >= 12) window.clearInterval(t);
    }, 5000);
    return () => window.clearInterval(t);
  }, [load]);

  /** One tap: off to Safepay to approve the card; renewals then happen automatically. */
  async function payWithCard(code: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await apiFetch<{ checkoutUrl: string }>('/api/workspace/billing/card/checkout', {
        method: 'POST',
        body: JSON.stringify({ planCode: code, returnPath: window.location.pathname }),
      });
      window.location.assign(r.checkoutUrl);
    } catch (e) {
      setError(errText(e, 'Could not start card payment.'));
      setBusy(false);
    }
  }

  async function stopAutoRenew() {
    if (!window.confirm('Turn off automatic renewal? Your plan stays active until the end of the paid period.')) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/workspace/billing/card/stop', { method: 'POST' });
      setNotice('Automatic renewal is off. Your plan stays active until the end of the paid period.');
      await load();
    } catch (e) {
      setError(errText(e, 'Could not turn off automatic renewal.'));
    } finally {
      setBusy(false);
    }
  }

  const open = data?.invoices.find((i) => i.status === 'ISSUED' || i.status === 'PAYMENT_SUBMITTED') || null;

  const paymentsHref = typeof window !== 'undefined' && window.location.pathname.startsWith('/provider')
    ? '/provider/payments?view=invoices' : '/business/payments?view=invoices';

  function onPaid(inv: Invoice) {
    setPaying(null);
    setNotice(inv.provisionalState === 'ACTIVE'
      ? `Payment submitted. ${inv.planName} is on now. Your invoice will appear in Payments once we confirm the payment.`
      : `Payment submitted. ${inv.planName} switches on and your invoice appears in Payments once we confirm the payment.`);
    void load();
  }

  async function choose(code: string) {
    const plan = data?.plans.find((p) => p.code === code);
    if (plan && Number(plan.price) > 0) {
      // Bank or wallet: open the payment window; nothing is created until the owner submits.
      const m = months[code] || 1;
      setError(null);
      setPaying({ planCode: code, planName: plan.name, months: m, amount: Number(plan.price) * m, currency: plan.currency });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await apiFetch<Invoice | { switched: boolean }>('/api/workspace/billing/invoices', {
        method: 'POST',
        body: JSON.stringify({ planCode: code, months: months[code] || 1 }),
      });
      setNotice('switched' in r ? 'You are now on the free plan.' : `Payment request ${billNumber(r)} created. Pay the account below; your invoice is issued once we confirm the payment.`);
      await load();
    } catch (e) {
      setError(errText(e, 'Could not create the payment request.'));
    } finally {
      setBusy(false);
    }
  }

  async function cancel(inv: Invoice) {
    setBusy(true);
    try {
      await apiFetch(`/api/workspace/billing/invoices/${inv.id}/cancel`, { method: 'POST' });
      setNotice(`Payment request ${billNumber(inv)} cancelled.`);
      await load();
    } catch (e) {
      setError(errText(e, 'Could not cancel the payment request.'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className={s.stack}>{[0, 1].map((i) => <div key={i} className={s.skel} style={{ height: 120 }} />)}</div>;
  }

  const sub = data?.subscription;
  const currentCode = data?.plan.planCode;
  const paidUntil = sub?.currentPeriodEnd;
  // Only confirmed payments are invoices; open and cancelled requests are not listed here.
  const paidInvoices = (data?.invoices || []).filter((i) => i.status === 'PAID');

  return (
    <div className={s.stack}>
      {error && <div className={`${s.alert} ${s.alertErr}`} role="alert"><i className="fa-solid fa-circle-exclamation" /> {error}</div>}
      {notice && <div className={`${s.alert} ${s.alertOk}`} role="status"><i className="fa-solid fa-circle-check" /> {notice}</div>}

      <div className={`${s.stats} ${s.stats3}`}>
        <div className={s.stat}>
          <span className={s.iconTile}><i className="fa-solid fa-crown" /></span>
          <div className={s.statText}>
            <div className={s.statLabel}>Current plan</div>
            <div className={s.statValue}>{data?.plan.planName || 'Starter'}</div>
          </div>
        </div>
        <div className={s.stat}>
          <span className={`${s.iconTile} ${s.toneGreen}`}><i className="fa-solid fa-calendar" /></span>
          <div className={s.statText}>
            <div className={s.statLabel}>Paid until</div>
            <div className={s.statValue}>{paidUntil ? dateLabel(paidUntil) : Number(data?.plan.price || 0) === 0 ? 'Free plan' : 'No end date'}</div>
          </div>
        </div>
        <div className={s.stat}>
          <span className={`${s.iconTile} ${open ? s.toneAmber : s.toneSlate}`}><i className="fa-solid fa-file-invoice" /></span>
          <div className={s.statText}>
            <div className={s.statLabel}>Payment due</div>
            <div className={s.statValue}>{open ? money(open.amount, open.currency) : 'None'}</div>
          </div>
        </div>
      </div>

      {sub?.autoRenew && sub.safepayStatus === 'UNPAID' && (
        <div className={`${s.alert} ${s.alertErr}`} data-flash-skip role="alert">
          <i className="fa-solid fa-credit-card" />
          <span style={{ flex: 1 }}>Your card could not be charged for {sub.planName}. Use another card to keep your plan.</span>
          <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={busy}
            onClick={() => sub.planCode && payWithCard(sub.planCode)}>
            Update card
          </button>
        </div>
      )}
      {sub?.autoRenew && sub.safepayStatus !== 'UNPAID' && (
        <div className={`${s.alert} ${s.alertOk}`} data-flash-skip role="status">
          <i className="fa-solid fa-rotate" />
          <span style={{ flex: 1 }}>
            {sub.planName} renews automatically on your card
            {paidUntil ? <> on <strong>{dateLabel(paidUntil)}</strong></> : null}. Receipts appear under Invoices.
          </span>
          <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} disabled={busy} onClick={stopAutoRenew}>
            Turn off auto-renew
          </button>
        </div>
      )}

      {open && (
        <section className={s.panel}>
          <div className={s.panelHead}>
            <div className={s.panelHeadText}>
              <h2>Payment request {billNumber(open)}</h2>
              <p>
                {open.planName} for {open.months} {open.months === 1 ? 'month' : 'months'} ·{' '}
                <strong>{money(open.amount, open.currency)}</strong> · due {dateLabel(open.dueDate)}
              </p>
            </div>
            <span className={`${s.chip} ${TONE[INVOICE_STATUS[open.status].tone]}`}>{INVOICE_STATUS[open.status].label}</span>
          </div>
          <div className={s.panelBody}>
            {open.status === 'ISSUED' && data?.plans.find((p) => p.code === open.planCode)?.cardReady && (
              <div className={s.btnRow} style={{ marginBottom: 16 }}>
                <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={busy} onClick={() => payWithCard(open.planCode)}>
                  <i className="fa-solid fa-credit-card" /> Pay {money(open.amount, open.currency)} with card
                </button>
                <span className={s.hint}>One tap. Your plan switches on straight away and renews monthly on the same card. Or pay by bank below.</span>
              </div>
            )}
            {open.status === 'PAYMENT_SUBMITTED' ? (
              <p>
                You reported a {METHOD_LABEL[open.paymentMethod || 'OTHER'].toLowerCase()} with ID{' '}
                <strong className={s.code}>{open.paymentReference}</strong>.{' '}
                {open.provisionalState === 'ACTIVE'
                  ? <>{open.planName} is already on while we verify it. Your invoice is issued once it&apos;s confirmed.</>
                  : open.provisionalState === 'REVERTED'
                    ? <>We haven&apos;t been able to verify it yet, so your previous plan is back for now. {open.planName} switches on again as soon as it&apos;s confirmed.</>
                    : <>{open.planName} switches on as soon as we confirm it reaches our account.</>}
              </p>
            ) : (
              <div className={s.stack}>
                {open.adminNote && <div className={`${s.alert} ${s.alertErr}`}>{open.adminNote}</div>}
                <div className={s.btnRow}>
                  <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={busy}
                    onClick={() => setPaying({
                      planCode: open.planCode, planName: open.planName, months: open.months,
                      amount: Number(open.amount), currency: open.currency, invoiceId: open.id, reference: billNumber(open),
                    })}>
                    <i className="fa-solid fa-building-columns" /> Pay {money(open.amount, open.currency)} by bank or wallet
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className={s.panelFoot}>
            <div className={s.btnRow}>
              {open.status === 'ISSUED' && (
                <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} disabled={busy} onClick={() => cancel(open)}>
                  Cancel request
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      <section className={s.panel}>
        <div className={s.panelHead}>
          <div className={s.panelHeadText}>
            <h2>Change plan</h2>
            <p>
              Fastest: pay with card in one tap. The plan starts immediately, your invoice arrives straight away, and it
              renews monthly on the same card. Or pay by bank or wallet: the plan switches on when you report the payment
              and the invoice is issued once we verify it.
            </p>
          </div>
        </div>
        <div className={s.panelBody}>
          <div className={s.promoGrid}>
            {(data?.plans || []).map((p) => {
              const m = months[p.code] || 1;
              const current = p.code === currentCode;
              const free = Number(p.price) === 0;
              return (
                <div key={p.code} className={s.panel} style={{ padding: 16, display: 'grid', gap: 10 }}>
                  <div className={s.rowTitle}>
                    {p.name} {current && <span className={`${s.chip} ${s.chipGreen}`}>Current</span>}
                  </div>
                  <div className={s.statValue}>
                    {free ? 'Free' : money(p.price, p.currency)}
                    {!free && <span className={s.hint}> / month</span>}
                  </div>
                  {!free && (
                    <label className={s.field}>
                      <span className={s.label}>Pay for</span>
                      <Dropdown id={`term-${p.code}`} aria-label="Months to pay for" value={String(m)}
                        onChange={(v) => setMonths({ ...months, [p.code]: Number(v) })}
                        options={(data?.terms || [1, 3, 6, 12]).map((t) => ({ value: String(t), label: `${t} ${t === 1 ? 'month' : 'months'}`, sublabel: money(Number(p.price) * t, p.currency) }))} />
                    </label>
                  )}
                  {!free && p.cardReady && !(current && sub?.autoRenew && sub.safepayStatus === 'ACTIVE') && (
                    <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={busy} onClick={() => payWithCard(p.code)}>
                      <i className="fa-solid fa-credit-card" /> {current ? 'Renew with card' : `Pay with card`} · auto-renew
                    </button>
                  )}
                  {!free && p.cardReady && <span className={s.hint}>Instant. Recommended.</span>}
                  <button type="button" className={`${s.btn} ${!free && p.cardReady ? s.btnGhost : current ? s.btnSoft : s.btnPrimary}`}
                    disabled={busy || open?.status === 'PAYMENT_SUBMITTED' || (current && free) || (free && !!sub?.autoRenew && sub.safepayStatus === 'ACTIVE')}
                    onClick={() => choose(p.code)}>
                    {current ? (free ? 'Current plan' : 'Renew by bank transfer') : free ? 'Move to free plan'
                      : p.cardReady ? 'Pay by bank or wallet' : `Pay for ${p.name} by bank or wallet`}
                  </button>
                </div>
              );
            })}
          </div>
          {open?.status === 'PAYMENT_SUBMITTED' && <p className={s.hint}>You can choose another plan once your last payment is confirmed.</p>}
        </div>
      </section>

      <div className={`${s.alert} ${s.alertOk}`} role="note">
        <i className="fa-solid fa-file-invoice" />
        <span style={{ flex: 1 }}>
          {paidInvoices.length > 0
            ? `You have ${paidInvoices.length} ${paidInvoices.length === 1 ? 'invoice' : 'invoices'}. They are kept under Payments.`
            : 'Your invoices appear under Payments once a plan payment is confirmed.'}
        </span>
        <a className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} href={paymentsHref}>Open invoices</a>
      </div>

      <PlanPayModal payment={paying} payee={data?.payee} onClose={() => setPaying(null)} onPaid={onPaid} />
    </div>
  );
}

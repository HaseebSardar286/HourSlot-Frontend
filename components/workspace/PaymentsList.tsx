'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Modal from '@/components/Modal';
import DataTable from '@/components/DataTable';
import type { Workspace } from '@/lib/workspace-api';
import {
  METHOD_ICON, METHOD_LABEL, PAYMENT_STATUS, REMOTE_METHODS, dateLabel, methodLabel, money, qrText, windowLabel,
  type BookingTicket, type MethodType, type PaymentMethod, type PaymentRecord, type PaymentSettings, type TransferMode,
} from '@/lib/payments';
import Dropdown, { Switch } from '@/components/ui/Dropdown';
import TicketQr from '@/components/payments/TicketQr';
import DuemetInvoices from './DuemetInvoices';
import { useAuth } from '@/lib/auth-context';
import s from './tools.module.css';
import pay from '@/components/payments/pay.module.css';

const proofUrl = (id: number) => `/api/workspace/payment-records/${id}/proof`;

type Ledger = {
  summary: { confirmedTotal: number; confirmedThisMonth: number; awaitingReview: number; awaitingPayment?: number };
  payments: PaymentRecord[];
};

const MODES: { value: TransferMode; label: string; hint: string }[] = [
  { value: 'OFF', label: 'Pay at the visit', hint: 'No payment when booking' },
  { value: 'OPTIONAL', label: 'Customer chooses', hint: 'Pay now or at the visit' },
  { value: 'REQUIRED', label: 'Pay when booking', hint: 'Booking waits for payment' },
];
const WINDOWS = [15, 30, 60, 120, 240, 720, 1440];

type Filter = 'ALL' | 'SUBMITTED' | 'CONFIRMED' | 'REJECTED';

type PackageRequest = {
  id: number; packageName: string; price: number; currency: string; sessionsCount: number;
  customerName: string; createdAt: string;
};

type RefundDue = {
  bookingId: number; bookingCode: string; bookingTime: string; amount: number; currency: string;
  serviceName?: string; customerName: string; customerPhone?: string; methodType?: MethodType; refundDueAt: string;
};

const TONE = { amber: s.chipAmber, green: s.chipGreen, rose: s.chipRose } as const;
const ALL_METHODS = Object.keys(METHOD_LABEL) as MethodType[];
const NEEDS_ACCOUNT: MethodType[] = ['JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER', 'RAAST'];

const emptyMethod = {
  methodType: 'JAZZCASH' as MethodType, accountTitle: '', accountNumber: '', iban: '', bankName: '', instructions: '', active: true,
  qrImageUrl: null as string | null | undefined,
};

function errText(e: unknown, fallback: string) {
  return (e as { message?: string })?.message || fallback;
}

export default function PaymentsList({ workspace }: { workspace: Workspace }) {
  const { user } = useAuth();
  const isOwner = user?.role === 'BUSINESS_OWNER';
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  // check dialog (screenshot + confirm / reject)
  const [checking, setChecking] = useState<PaymentRecord | null>(null);
  const [rejecting, setRejecting] = useState<PaymentRecord | null>(null);
  const [reason, setReason] = useState('');

  // package requests waiting for payment, and refunds owed for cancelled paid bookings
  const [pkgRequests, setPkgRequests] = useState<PackageRequest[]>([]);
  const [refunds, setRefunds] = useState<RefundDue[]>([]);
  const [declining, setDeclining] = useState<PackageRequest | null>(null);
  const [refunding, setRefunding] = useState<RefundDue | null>(null);
  const [refundRef, setRefundRef] = useState('');

  // pay-when-booking rules
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [qrBusy, setQrBusy] = useState(false);

  // payment method dialog
  const [methodForm, setMethodForm] = useState<(typeof emptyMethod & { id?: number }) | null>(null);
  const [methodErr, setMethodErr] = useState<string | null>(null);

  // record payment dialog
  const [recordOpen, setRecordOpen] = useState(false);
  const [code, setCode] = useState('');
  const [ticket, setTicket] = useState<BookingTicket | null>(null);
  const [rec, setRec] = useState({ amount: '', methodType: 'CASH' as MethodType, reference: '', note: '' });
  const [recErr, setRecErr] = useState<string | null>(null);
  const [recBusy, setRecBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [l, m, st, pk, rf] = await Promise.all([
        apiFetch<Ledger>('/api/workspace/payment-records'),
        apiFetch<PaymentMethod[]>('/api/workspace/payment-methods'),
        apiFetch<PaymentSettings>('/api/workspace/payment-settings').catch(() => null),
        apiFetch<PackageRequest[]>('/api/workspace/package-purchases').catch(() => []),
        apiFetch<RefundDue[]>('/api/workspace/refunds-due').catch(() => []),
      ]);
      setLedger(l);
      setMethods(Array.isArray(m) ? m : []);
      if (st) setSettings(st);
      setPkgRequests(Array.isArray(pk) ? pk : []);
      setRefunds(Array.isArray(rf) ? rf : []);
      setError(null);
    } catch (e) {
      setError(errText(e, 'Could not load payments.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    void load();
  }, [load]);

  const rows = useMemo(() => ledger?.payments ?? [], [ledger]);
  const waiting = rows.filter((p) => p.status === 'SUBMITTED');
  const remoteCount = methods.filter((m) => m.active && REMOTE_METHODS.includes(m.methodType)).length;
  // Until the owner picks a tab: set up accounts first, then whatever needs checking, else the history.
  // ?view=invoices (from the Subscription page) opens the Duemet invoices tab.
  const [view, setView] = useState<'check' | 'history' | 'setup' | 'invoices' | null>(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === 'invoices' ? 'invoices' : null);
  const toCheck = waiting.length + pkgRequests.length + refunds.length;
  const currentView = view ?? (loading ? 'check' : toCheck > 0 ? 'check' : remoteCount === 0 ? 'setup' : 'history');

  async function act(path: string, body: unknown, note: string) {
    try {
      await apiFetch(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
      setNotice(note);
      setDeclining(null);
      setRefunding(null);
      setReason('');
      setRefundRef('');
      await load();
    } catch (e) {
      setError(errText(e, 'Could not save that.'));
    }
  }
  const currency = rows[0]?.currency || 'PKR';

  const shown = rows
    .filter((p) => filter === 'ALL' || p.status === filter)
    .filter((p) => {
      const term = q.trim().toLowerCase();
      if (!term) return true;
      return `${p.customerName} ${p.bookingCode} ${p.reference} ${p.receiptNumber}`.toLowerCase().includes(term);
    });

  const counts: Record<Filter, number> = {
    ALL: rows.length,
    SUBMITTED: waiting.length,
    CONFIRMED: rows.filter((p) => p.status === 'CONFIRMED').length,
    REJECTED: rows.filter((p) => p.status === 'REJECTED').length,
  };

  async function confirm(p: PaymentRecord) {
    setBusyId(p.id);
    try {
      const r = await apiFetch<PaymentRecord>(`/api/workspace/payment-records/${p.id}/confirm`, { method: 'POST' });
      const finalised = p.bookingStatus === 'PENDING' && Number(p.amount) >= Number(p.totalPrice || 0);
      setNotice(finalised
        ? `Confirmed. Booking ${p.bookingCode} is now confirmed, and ${p.customerName || 'the customer'} was emailed receipt ${r.receiptNumber}.`
        : `Confirmed. Receipt ${r.receiptNumber} sent to ${p.customerName || 'the customer'}.`);
      setChecking(null);
      await load();
    } catch (e) {
      setError(errText(e, 'Could not confirm the payment.'));
    } finally {
      setBusyId(null);
    }
  }

  async function reject() {
    if (!rejecting) return;
    setBusyId(rejecting.id);
    try {
      await apiFetch(`/api/workspace/payment-records/${rejecting.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      setNotice('Marked as not matched. The customer was emailed why and can send it again.');
      setRejecting(null);
      setChecking(null);
      setReason('');
      await load();
    } catch (e) {
      setError(errText(e, 'Could not update the payment.'));
    } finally {
      setBusyId(null);
    }
  }

  async function saveSettings(next: PaymentSettings) {
    const before = settings;
    setSettings(next);
    setSettingsBusy(true);
    try {
      setSettings(await apiFetch<PaymentSettings>('/api/workspace/payment-settings', { method: 'PUT', body: JSON.stringify(next) }));
      setNotice(next.transferMode === 'OFF'
        ? 'Customers pay at the visit.'
        : `Saved. Unpaid bookings hold their slot for ${windowLabel(next.payWindowMinutes)}.`);
    } catch (e) {
      setSettings(before);
      setError(errText(e, 'Could not save the payment rules.'));
    } finally {
      setSettingsBusy(false);
    }
  }

  async function uploadQr(file: File | undefined) {
    if (!file || !methodForm?.id) return;
    setQrBusy(true);
    setMethodErr(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const m = await apiFetch<PaymentMethod>(`/api/workspace/payment-methods/${methodForm.id}/qr`, { method: 'POST', body: form });
      setMethodForm({ ...methodForm, qrImageUrl: m.qrImageUrl });
      await load();
    } catch (e) {
      setMethodErr(errText(e, 'Could not upload the QR code.'));
    } finally {
      setQrBusy(false);
    }
  }

  async function removeQr() {
    if (!methodForm?.id) return;
    setQrBusy(true);
    try {
      await apiFetch(`/api/workspace/payment-methods/${methodForm.id}/qr`, { method: 'DELETE' });
      setMethodForm({ ...methodForm, qrImageUrl: null });
      await load();
    } catch (e) {
      setMethodErr(errText(e, 'Could not remove the QR code.'));
    } finally {
      setQrBusy(false);
    }
  }

  async function saveMethod() {
    if (!methodForm) return;
    setMethodErr(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the QR is saved by its own upload
      const { id, qrImageUrl, ...body } = methodForm;
      await apiFetch(id ? `/api/workspace/payment-methods/${id}` : '/api/workspace/payment-methods', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      });
      setMethodForm(null);
      await load();
    } catch (e) {
      setMethodErr(errText(e, 'Could not save the payment method.'));
    }
  }

  async function removeMethod(m: PaymentMethod) {
    try {
      await apiFetch(`/api/workspace/payment-methods/${m.id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(errText(e, 'Could not remove the payment method.'));
    }
  }

  async function lookup() {
    setRecErr(null);
    setTicket(null);
    if (!code.trim()) return;
    try {
      const t = await apiFetch<BookingTicket>(`/api/workspace/tickets/${encodeURIComponent(code.trim())}`);
      setTicket(t);
      setRec((r) => ({ ...r, amount: String(Number(t.due || 0) || '') }));
    } catch (e) {
      setRecErr(errText(e, 'No booking with that code.'));
    }
  }

  async function record() {
    if (!ticket) return;
    setRecBusy(true);
    setRecErr(null);
    try {
      const r = await apiFetch<PaymentRecord>(`/api/workspace/bookings/${ticket.booking.id}/payment-records`, {
        method: 'POST',
        body: JSON.stringify({ ...rec, amount: Number(rec.amount) }),
      });
      setNotice(`Payment recorded. Receipt ${r.receiptNumber}.`);
      closeRecord();
      await load();
    } catch (e) {
      setRecErr(errText(e, 'Could not record the payment.'));
    } finally {
      setRecBusy(false);
    }
  }

  function closeRecord() {
    setRecordOpen(false);
    setCode('');
    setTicket(null);
    setRec({ amount: '', methodType: 'CASH', reference: '', note: '' });
    setRecErr(null);
  }

  const receiptHref = (id: number) => `/docs/receipt/${id}?as=workspace`;

  return (
    <div className={s.page}>
      <header className={s.head}>
        <div>
          <h1>Payments</h1>
          <p>
            Customers pay {workspace === 'business' ? 'your business' : 'you'} directly by cash, wallet or bank.
            Duemet never holds the money; it keeps the record and issues receipts.
          </p>
        </div>
        <div className={s.headActions}>
          <button type="button" className={`${s.btn} ${s.btnSoft}`}
            onClick={() => { setView('setup'); setMethodErr(null); setMethodForm({ ...emptyMethod }); }}>
            <i className="fa-solid fa-building-columns" /> Add payment method
          </button>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setRecordOpen(true)}>
            <i className="fa-solid fa-plus" /> Record a payment
          </button>
        </div>
      </header>

      <nav className={pay.viewTabs} role="tablist" aria-label="Payments">
        <button type="button" role="tab" aria-selected={currentView === 'check'}
          className={`${pay.viewTab} ${currentView === 'check' ? pay.viewTabOn : ''}`} onClick={() => setView('check')}>
          <i className="fa-solid fa-magnifying-glass-dollar" aria-hidden />
          <span><strong>To check</strong><small>Screenshots from customers</small></span>
          {toCheck > 0 && <b className={pay.badge}>{toCheck}</b>}
        </button>
        <button type="button" role="tab" aria-selected={currentView === 'history'}
          className={`${pay.viewTab} ${currentView === 'history' ? pay.viewTabOn : ''}`} onClick={() => setView('history')}>
          <i className="fa-solid fa-receipt" aria-hidden />
          <span><strong>All payments</strong><small>Received, receipts</small></span>
        </button>
        <button type="button" role="tab" aria-selected={currentView === 'setup'}
          className={`${pay.viewTab} ${currentView === 'setup' ? pay.viewTabOn : ''}`} onClick={() => setView('setup')}>
          <i className="fa-solid fa-building-columns" aria-hidden />
          <span><strong>Your accounts</strong><small>Bank, wallets, QR, rules</small></span>
          {!loading && remoteCount === 0 && <b className={`${pay.badge} ${pay.badgeWarn}`}>!</b>}
        </button>
        {isOwner && (
          <button type="button" role="tab" aria-selected={currentView === 'invoices'}
            className={`${pay.viewTab} ${currentView === 'invoices' ? pay.viewTabOn : ''}`} onClick={() => setView('invoices')}>
            <i className="fa-solid fa-file-invoice" aria-hidden />
            <span><strong>Duemet invoices</strong><small>Your plan payments</small></span>
          </button>
        )}
      </nav>

      {currentView === 'invoices' && <DuemetInvoices />}

      {!loading && remoteCount === 0 && currentView !== 'setup' && (
        <div className={`${pay.hold} ${pay.holdBlue}`}>
          <i className="fa-solid fa-building-columns" aria-hidden />
          <div>
            <strong>Add your bank or wallet account</strong>
            <span>Customers can only pay you when booking once they can see where to send the money.</span>
          </div>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} style={{ marginLeft: 'auto' }} onClick={() => setView('setup')}>
            Set up now
          </button>
        </div>
      )}

      {error && <div className={`${s.alert} ${s.alertErr}`} role="alert"><i className="fa-solid fa-circle-exclamation" /> {error}</div>}
      {notice && <div className={`${s.alert} ${s.alertOk}`} role="status"><i className="fa-solid fa-circle-check" /> {notice}</div>}

      {currentView === 'setup' && (
        <div className={s.stack}>
          <section className={s.panel}>
            <div className={s.panelHead}>
              <div className={s.panelHeadText}>
                <h2>Where customers send money</h2>
                <p>These accounts and QR codes are shown to customers when they pay for a booking.</p>
              </div>
            </div>
            <div className={s.panelBody}>
              <div className={pay.acctGrid}>
                <button type="button" className={pay.addTile} onClick={() => { setMethodErr(null); setMethodForm({ ...emptyMethod }); }}>
                  <i className="fa-solid fa-plus" aria-hidden />
                  <strong>Add a payment method</strong>
                  <span>Bank account, JazzCash, Easypaisa, Raast or cash</span>
                </button>
                {methods.map((m) => (
                  <article key={m.id} className={`${pay.acctCard} ${m.active ? '' : pay.acctOff}`}>
                    <header>
                      <span className={s.iconTile}><i className={`fa-solid ${METHOD_ICON[m.methodType]}`} /></span>
                      <strong>{METHOD_LABEL[m.methodType]}{m.methodType === 'BANK_TRANSFER' && m.bankName ? ` · ${m.bankName}` : ''}</strong>
                      {!m.active && <span className={`${s.chip} ${s.chipSlate}`}>Hidden</span>}
                    </header>
                    <div className={pay.acctBody}>
                      {m.qrImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- uploaded QR
                        <img src={m.qrImageUrl} alt="" className={pay.acctQr} />
                      ) : (m.accountNumber || m.iban) ? (
                        <span className={pay.acctQr}><TicketQr code={qrText(m)} size={72} alt="" /></span>
                      ) : null}
                      <div>
                        {m.accountTitle && <div>{m.accountTitle}</div>}
                        {m.iban && <div className={pay.mono}>{m.iban}</div>}
                        {m.accountNumber && <div className={pay.mono}>{m.accountNumber}</div>}
                        {!m.accountTitle && !m.iban && !m.accountNumber && <div className={s.hint}>{m.instructions || 'Paid at the venue'}</div>}
                        {REMOTE_METHODS.includes(m.methodType) && (
                          <div className={s.hint}>{m.qrImageUrl ? 'Your own QR' : 'QR made from these details'}</div>
                        )}
                      </div>
                    </div>
                    <footer className={s.btnRow}>
                      <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnSoft}`}
                        onClick={() => { setMethodErr(null); setMethodForm({ ...emptyMethod, ...m, accountTitle: m.accountTitle || '', accountNumber: m.accountNumber || '', iban: m.iban || '', bankName: m.bankName || '', instructions: m.instructions || '' }); }}>
                        <i className="fa-solid fa-pen" /> Edit{REMOTE_METHODS.includes(m.methodType) ? ' or add QR' : ''}
                      </button>
                      <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnGhost}`} onClick={() => removeMethod(m)}>
                        <i className="fa-solid fa-trash" /> Remove
                      </button>
                    </footer>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {settings && (
            <section className={s.panel}>
              <div className={s.panelHead}>
                <div className={s.panelHeadText}>
                  <h2>Payment when booking</h2>
                  <p>
                    {settings.transferMode === 'OFF'
                      ? 'Customers book and pay you at the visit. You confirm each booking.'
                      : 'Customers send the money to your account and upload a screenshot. Confirming the payment confirms the booking.'}
                  </p>
                </div>
              </div>
              <div className={s.panelBody} style={{ display: 'grid', gap: 14 }}>
                <div className={pay.radioRow} role="radiogroup" aria-label="Payment when booking">
                  {MODES.map((m) => (
                    <button key={m.value} type="button" role="radio" aria-checked={settings.transferMode === m.value}
                      disabled={settingsBusy}
                      className={`${pay.radio} ${settings.transferMode === m.value ? pay.radioOn : ''}`}
                      onClick={() => settings.transferMode !== m.value && saveSettings({ ...settings, transferMode: m.value })}>
                      <strong>{m.label}</strong>
                      <span>{m.hint}</span>
                    </button>
                  ))}
                </div>
                {settings.transferMode !== 'OFF' && (
                  <label className={s.field} style={{ maxWidth: 360 }}>
                    <span className={s.label}>Hold an unpaid booking for</span>
                    <Dropdown id="pay-window" aria-label="Hold an unpaid booking for" value={String(settings.payWindowMinutes)}
                      onChange={(v) => saveSettings({ ...settings, payWindowMinutes: Number(v) })}
                      options={WINDOWS.map((w) => ({ value: String(w), label: windowLabel(w) }))} />
                    <span className={s.hint}>If no screenshot arrives in time, the slot is released and the customer is emailed.</span>
                  </label>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {currentView !== 'setup' && currentView !== 'invoices' && (
      <div className={`${s.stats} ${s.stats3}`}>
        <div className={s.stat}>
          <span className={`${s.iconTile} ${s.toneGreen}`}><i className="fa-solid fa-calendar-check" /></span>
          <div className={s.statText}>
            <div className={s.statLabel}>Received this month</div>
            <div className={s.statValue}>{loading ? '…' : money(ledger?.summary.confirmedThisMonth, currency)}</div>
          </div>
        </div>
        <div className={s.stat}>
          <span className={s.iconTile}><i className="fa-solid fa-sack-dollar" /></span>
          <div className={s.statText}>
            <div className={s.statLabel}>Received in total</div>
            <div className={s.statValue}>{loading ? '…' : money(ledger?.summary.confirmedTotal, currency)}</div>
          </div>
        </div>
        <div className={s.stat}>
          <span className={`${s.iconTile} ${s.toneAmber}`}><i className="fa-solid fa-hourglass-half" /></span>
          <div className={s.statText}>
            <div className={s.statLabel}>Waiting for you to confirm</div>
            <div className={s.statValue}>{loading ? '…' : ledger?.summary.awaitingReview ?? 0}</div>
          </div>
        </div>
      </div>
      )}

      {currentView !== 'setup' && currentView !== 'invoices' && (
        <div className={s.stack}>
          {currentView === 'check' && refunds.length > 0 && (
            <section className={s.panel}>
              <div className={s.panelHead}>
                <div className={s.panelHeadText}>
                  <h2>Refunds to send</h2>
                  <p>These paid bookings were cancelled. Send the money back to the customer, then mark it sent.</p>
                </div>
              </div>
              <div className={s.list}>
                {refunds.map((r) => (
                  <div key={r.bookingId} className={s.row}>
                    <span className={`${s.iconTile} ${s.toneRose}`}><i className="fa-solid fa-rotate-left" /></span>
                    <div className={s.rowMain}>
                      <div className={s.rowTitle}>{r.customerName || 'Customer'} <span className={s.hint}>{r.bookingCode} · {r.serviceName}</span></div>
                      <div className={s.rowMeta}>
                        Cancelled {dateLabel(r.refundDueAt, true)}{r.methodType ? ` · paid by ${methodLabel(r.methodType)}` : ''}
                        {r.customerPhone ? ` · ${r.customerPhone}` : ''}
                      </div>
                    </div>
                    <div className={s.rowEnd}>
                      <span className={s.amount}>{money(r.amount, r.currency)}</span>
                      <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnPrimary}`} onClick={() => { setRefunding(r); setRefundRef(''); }}>
                        <i className="fa-solid fa-check" /> Mark as sent
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {currentView === 'check' && pkgRequests.length > 0 && (
            <section className={s.panel}>
              <div className={s.panelHead}>
                <div className={s.panelHeadText}>
                  <h2>Package requests</h2>
                  <p>Customers asked for these packages. Confirm once they have paid you; the sessions become usable then.</p>
                </div>
              </div>
              <div className={s.list}>
                {pkgRequests.map((p) => (
                  <div key={p.id} className={s.row}>
                    <span className={`${s.iconTile} ${s.toneAmber}`}><i className="fa-solid fa-gift" /></span>
                    <div className={s.rowMain}>
                      <div className={s.rowTitle}>{p.customerName || 'Customer'} <span className={s.hint}>{p.packageName}</span></div>
                      <div className={s.rowMeta}>{p.sessionsCount} sessions · requested {dateLabel(p.createdAt, true)}</div>
                    </div>
                    <div className={s.rowEnd}>
                      <span className={s.amount}>{money(p.price, p.currency)}</span>
                      <div className={s.btnRow}>
                        <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnGhost}`} onClick={() => { setDeclining(p); setReason(''); }}>
                          Not paid
                        </button>
                        <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnPrimary}`}
                          onClick={() => act(`/api/workspace/package-purchases/${p.id}/confirm`, null,
                            `${p.packageName} is now active for ${p.customerName || 'the customer'}. They were emailed.`)}>
                          <i className="fa-solid fa-check" /> Paid, activate
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {currentView === 'check' && toCheck === 0 && (
            <section className={s.panel}>
              <div className={s.empty} style={{ padding: '48px 20px' }}>
                <i className="fa-solid fa-circle-check" />
                <strong>Nothing to check</strong>
                When a customer pays and uploads a screenshot, it appears here for you to confirm.
              </div>
            </section>
          )}
          {currentView === 'check' && waiting.length > 0 && (
            <section className={s.panel}>
              <div className={s.panelHead}>
                <div className={s.panelHeadText}>
                  <h2>Check these payments</h2>
                  <p>
                    Customers sent these with a screenshot. Check that the money reached your account, then confirm.
                    Bookings waiting for payment are confirmed automatically once paid in full.
                  </p>
                </div>
              </div>
              <div className={s.list}>
                {waiting.map((p) => (
                  <div key={p.id} className={s.row}>
                    {p.hasProof ? (
                      <button type="button" className={pay.thumb} onClick={() => setChecking(p)} aria-label={`See ${p.customerName || 'the customer'}'s screenshot`}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-cookie image */}
                        <img src={proofUrl(p.id)} alt="" />
                      </button>
                    ) : (
                      <span className={`${s.iconTile} ${s.toneAmber}`}><i className={`fa-solid ${METHOD_ICON[p.methodType] || 'fa-wallet'}`} /></span>
                    )}
                    <div className={s.rowMain}>
                      <div className={s.rowTitle}>
                        {p.customerName || 'Customer'} <span className={s.hint}>{p.bookingCode} · {p.serviceName}</span>
                      </div>
                      <div className={s.rowMeta}>
                        {methodLabel(p.methodType)}
                        {p.reference ? <> · ID <strong className={s.code}>{p.reference}</strong></> : ' · no transaction ID'}
                        {' · '}{dateLabel(p.createdAt, true)}
                        {p.bookingStatus === 'PENDING' && <> · <span className={`${s.chip} ${s.chipAmber}`}>Booking waits for this</span></>}
                      </div>
                    </div>
                    <div className={s.rowEnd}>
                      <span className={s.amount}>{money(p.amount, p.currency)}</span>
                      <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnPrimary}`} disabled={busyId === p.id}
                        onClick={() => setChecking(p)}>
                        <i className="fa-solid fa-magnifying-glass" /> Check
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {currentView === 'history' && (
          <section className={s.panel}>
            <div className={s.toolbar}>
              <div className={s.tabs} role="tablist" aria-label="Filter payments">
                {(['ALL', 'CONFIRMED', 'SUBMITTED', 'REJECTED'] as Filter[]).map((f) => (
                  <button key={f} type="button" role="tab" aria-selected={filter === f}
                    className={filter === f ? s.tabOn : ''} onClick={() => setFilter(f)}>
                    {f === 'ALL' ? 'All' : PAYMENT_STATUS[f].label}
                    {counts[f] > 0 ? ` ${counts[f]}` : ''}
                  </button>
                ))}
              </div>
              <label className={s.search}>
                <i className="fa-solid fa-magnifying-glass" aria-hidden />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Customer, booking or receipt" aria-label="Search payments" />
              </label>
            </div>

            {loading ? (
              <div className={s.panelBody}>
                {[0, 1, 2].map((i) => <div key={i} className={s.skel} style={{ height: 48 }} />)}
              </div>
            ) : shown.length === 0 ? (
              <div className={s.empty} style={{ padding: '48px 20px' }}>
                <i className="fa-solid fa-receipt" />
                <strong>{rows.length === 0 ? 'No payments recorded yet' : 'Nothing matches'}</strong>
                {rows.length === 0
                  ? 'Record cash at the counter with "Record a payment". Wallet and bank payments that customers report appear here for you to confirm.'
                  : 'Try another filter or search.'}
              </div>
            ) : (
              <DataTable<PaymentRecord>
                rows={shown}
                rowKey={(p) => p.id}
                defaultSort={{ key: 'date', dir: 'desc' }}
                columns={[
                  { key: 'date', header: 'Date', width: 150, sortValue: (p) => new Date(p.createdAt).getTime(), render: (p) => dateLabel(p.createdAt, true) },
                  {
                    key: 'customer', header: 'Customer', sortValue: (p) => p.customerName || '',
                    render: (p) => (
                      <div className={s.cellStack}>
                        <strong>{p.customerName || 'Customer'}</strong>
                        <span>{p.bookingCode} · {p.serviceName}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'method', header: 'Method', sortValue: (p) => methodLabel(p.methodType),
                    render: (p) => <span className={s.methodCell}><i className={`fa-solid ${METHOD_ICON[p.methodType] || 'fa-wallet'}`} /> {methodLabel(p.methodType)}</span>,
                  },
                  { key: 'ref', header: 'Reference', hideOnMobile: true, sortValue: (p) => p.reference || '', render: (p) => p.reference ? <span className={s.code}>{p.reference}</span> : <span className={s.hint}>—</span> },
                  {
                    key: 'status', header: 'Status', sortValue: (p) => p.status,
                    render: (p) => {
                      const st = PAYMENT_STATUS[p.status];
                      return <span className={`${s.chip} ${TONE[st.tone]}`} title={p.status === 'REJECTED' ? p.rejectionReason || undefined : undefined}>{st.label}</span>;
                    },
                  },
                  { key: 'amount', header: 'Amount', align: 'right', sortValue: (p) => Number(p.amount), render: (p) => <strong>{money(p.amount, p.currency)}</strong> },
                  {
                    key: 'docs', header: '', align: 'right',
                    render: (p) => (
                      <div className={s.btnRow} style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                        {p.hasProof && (
                          <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnGhost}`} onClick={() => setChecking(p)}>
                            <i className="fa-solid fa-image" /> Screenshot
                          </button>
                        )}
                        {p.receiptNumber && (
                          <a className={`${s.btn} ${s.btnSm} ${s.btnGhost}`} href={receiptHref(p.id)} target="_blank" rel="noreferrer">
                            <i className="fa-solid fa-receipt" /> {p.receiptNumber}
                          </a>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </section>
          )}
        </div>
      )}

      <Modal open={!!checking && !rejecting} title="Check this payment" onClose={() => setChecking(null)}
        footer={checking && checking.status === 'SUBMITTED' ? (
          <div className={s.btnRow}>
            <button type="button" className={`${s.btn} ${s.btnGhost}`} disabled={busyId === checking.id}
              onClick={() => { setRejecting(checking); setReason(''); }}>
              Not in my account
            </button>
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={busyId === checking.id} onClick={() => confirm(checking)}>
              <i className="fa-solid fa-check" /> {busyId === checking.id ? 'Confirming…' : 'Money received, confirm'}
            </button>
          </div>
        ) : (
          <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => setChecking(null)}>Close</button>
        )}>
        {checking && (
          <div className={pay.review}>
            <div>
              {checking.hasProof ? (
                <>
                  <div className={pay.shot}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-cookie image */}
                    <img src={proofUrl(checking.id)} alt={`Payment screenshot from ${checking.customerName || 'the customer'}`} />
                  </div>
                  <a className={`${s.hint} ${pay.shotLink}`} href={proofUrl(checking.id)} target="_blank" rel="noreferrer">
                    <i className="fa-solid fa-up-right-from-square" /> Open full size
                  </a>
                </>
              ) : (
                <div className={s.empty}><i className="fa-solid fa-image" /><strong>No screenshot</strong>Recorded before screenshots were required.</div>
              )}
            </div>
            <div className={s.stack}>
              <div className={pay.facts}>
                <div className={pay.detail}><span>Customer</span><strong>{checking.customerName || 'Customer'}</strong></div>
                <div className={pay.detail}><span>Amount</span><strong>{money(checking.amount, checking.currency)}</strong></div>
                <div className={pay.detail}><span>Booking price</span><strong>{money(checking.totalPrice, checking.currency)}</strong></div>
                <div className={pay.detail}><span>Paid by</span><strong>{methodLabel(checking.methodType)}</strong></div>
                <div className={pay.detail}><span>Transaction ID</span><strong className={pay.mono}>{checking.reference || 'Not given'}</strong></div>
                <div className={pay.detail}><span>Booking</span><strong>{checking.bookingCode} · {checking.serviceName}</strong></div>
                <div className={pay.detail}><span>Appointment</span><strong>{dateLabel(checking.bookingTime, true)}</strong></div>
                <div className={pay.detail}><span>Sent</span><strong>{dateLabel(checking.createdAt, true)}</strong></div>
              </div>
              {checking.status === 'SUBMITTED' && (
                <ul className={pay.checks}>
                  <li><i className="fa-solid fa-check" /> Open your bank or wallet app and find this amount.</li>
                  <li><i className="fa-solid fa-check" /> Check the date, the receiver (you) and the transaction ID on the screenshot.</li>
                  <li><i className="fa-solid fa-check" /> Screenshots can be edited. Confirm only when the money is in your account.</li>
                </ul>
              )}
              {checking.status === 'SUBMITTED' && checking.bookingStatus === 'PENDING' && (
                <p className={s.hint}>
                  {Number(checking.amount) >= Number(checking.totalPrice || 0)
                    ? 'Confirming also confirms the booking and emails both of you.'
                    : 'This is less than the price, so the booking stays unconfirmed until the rest is paid.'}
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!declining} title="Package not paid" onClose={() => setDeclining(null)}
        footer={
          <div className={s.btnRow}>
            <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => setDeclining(null)}>Cancel</button>
            <button type="button" className={`${s.btn} ${s.btnDanger}`} disabled={!reason.trim()}
              onClick={() => declining && act(`/api/workspace/package-purchases/${declining.id}/decline`, { reason },
                'Package request cancelled. The customer was told why.')}>
              Cancel the request
            </button>
          </div>
        }>
        <div className={s.stack}>
          <p>Tell {declining?.customerName || 'the customer'} why {declining?.packageName} wasn&apos;t confirmed.</p>
          <label className={s.field}>
            <span className={s.label}>Reason</span>
            <textarea id="pkg-reason" className={s.textarea} rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="We didn't receive a payment for this package." />
          </label>
        </div>
      </Modal>

      <Modal open={!!refunding} title="Refund sent" onClose={() => setRefunding(null)}
        footer={
          <div className={s.btnRow}>
            <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => setRefunding(null)}>Cancel</button>
            <button type="button" className={`${s.btn} ${s.btnPrimary}`}
              onClick={() => refunding && act(`/api/workspace/refunds-due/${refunding.bookingId}/sent`, { reference: refundRef },
                `Refund to ${refunding.customerName || 'the customer'} marked as sent. They were emailed.`)}>
              <i className="fa-solid fa-check" /> I sent it
            </button>
          </div>
        }>
        <div className={s.stack}>
          <p>
            Confirm you sent <strong>{money(refunding?.amount, refunding?.currency)}</strong> back to {refunding?.customerName || 'the customer'} for
            booking {refunding?.bookingCode}. They&apos;ll be emailed.
          </p>
          <label className={s.field}>
            <span className={s.label}>Transaction ID (optional)</span>
            <input id="refund-ref" className={s.input} value={refundRef} onChange={(e) => setRefundRef(e.target.value)} />
          </label>
        </div>
      </Modal>

      <Modal open={!!rejecting} title="Payment not found" onClose={() => setRejecting(null)}
        footer={
          <div className={s.btnRow}>
            <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => setRejecting(null)}>Cancel</button>
            <button type="button" className={`${s.btn} ${s.btnDanger}`} disabled={!reason.trim() || busyId === rejecting?.id} onClick={reject}>
              Send to customer
            </button>
          </div>
        }>
        <div className={s.stack}>
          <p>
            Tell {rejecting?.customerName || 'the customer'} why {money(rejecting?.amount, rejecting?.currency)}
            {rejecting?.reference ? <> with ID <strong>{rejecting.reference}</strong></> : ''} could not be matched.
            They get an email and can send it again{rejecting?.bookingStatus === 'PENDING' ? ', and their slot is held for another pay window' : ''}.
          </p>
          <label className={s.field}>
            <span className={s.label}>Reason</span>
            <textarea id="reject-reason" className={s.textarea} rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="No transfer with this ID has arrived in our JazzCash account." />
          </label>
        </div>
      </Modal>

      <Modal open={!!methodForm} title={methodForm?.id ? 'Edit payment method' : 'Add a payment method'} onClose={() => setMethodForm(null)}
        footer={
          <div className={s.btnRow}>
            <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => setMethodForm(null)}>Cancel</button>
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={saveMethod}>Save</button>
          </div>
        }>
        {methodForm && (
          <div className={s.stack}>
            {methodErr && <div className={`${s.alert} ${s.alertErr}`} role="alert">{methodErr}</div>}
            <label className={s.field}>
              <span className={s.label}>Method</span>
              <Dropdown id="method-type" aria-label="Method" value={methodForm.methodType}
                onChange={(v) => setMethodForm({ ...methodForm, methodType: v as MethodType })} options={ALL_METHODS.map((m) => ({ value: m, label: METHOD_LABEL[m], icon: METHOD_ICON[m] }))} />

            </label>
            {NEEDS_ACCOUNT.includes(methodForm.methodType) && (
              <div className={s.fieldGrid}>
                <label className={s.field}>
                  <span className={s.label}>Account title</span>
                  <input id="method-title" className={s.input} value={methodForm.accountTitle}
                    onChange={(e) => setMethodForm({ ...methodForm, accountTitle: e.target.value })} placeholder="Name on the account" />
                </label>
                <label className={s.field}>
                  <span className={s.label}>{methodForm.methodType === 'BANK_TRANSFER' ? 'Account number or IBAN' : methodForm.methodType === 'RAAST' ? 'Raast ID' : 'Wallet number'}</span>
                  <input id="method-number" className={s.input} value={methodForm.accountNumber}
                    onChange={(e) => setMethodForm({ ...methodForm, accountNumber: e.target.value })} />
                </label>
                {methodForm.methodType === 'BANK_TRANSFER' && (
                  <>
                    <label className={s.field}>
                      <span className={s.label}>IBAN</span>
                      <input id="method-iban" className={s.input} value={methodForm.iban}
                        onChange={(e) => setMethodForm({ ...methodForm, iban: e.target.value })} placeholder="PK36 SCBL 0000 0011 2345 6702" />
                    </label>
                    <label className={s.field}>
                      <span className={s.label}>Bank</span>
                      <input id="method-bank" className={s.input} value={methodForm.bankName}
                        onChange={(e) => setMethodForm({ ...methodForm, bankName: e.target.value })} placeholder="Meezan Bank" />
                    </label>
                  </>
                )}
              </div>
            )}
            {REMOTE_METHODS.includes(methodForm.methodType) && (
              <div className={s.field}>
                <span className={s.label}>QR code customers scan</span>
                {methodForm.id ? (
                  <div className={pay.qrEdit}>
                    {methodForm.qrImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- uploaded QR
                      <img src={methodForm.qrImageUrl} alt="Your payment QR" />
                    ) : (methodForm.accountNumber || methodForm.iban) ? (
                      <TicketQr code={qrText({ ...methodForm, id: methodForm.id, iban: methodForm.iban || null })} size={84} alt="Generated QR of these details" />
                    ) : null}
                    <div style={{ display: 'grid', gap: 6 }}>
                      <span className={s.hint}>
                        {methodForm.qrImageUrl
                          ? 'Customers see your own QR.'
                          : 'Customers see a QR made from these details. Upload the official QR from your bank or wallet app so they can pay by scanning.'}
                      </span>
                      <div className={s.btnRow}>
                        <label className={`${s.btn} ${s.btnSm} ${s.btnSoft}`} style={{ position: 'relative', overflow: 'hidden' }}>
                          <i className="fa-solid fa-upload" /> {qrBusy ? 'Uploading…' : methodForm.qrImageUrl ? 'Replace QR' : 'Upload QR'}
                          <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload payment QR image" disabled={qrBusy}
                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                            onChange={(e) => { void uploadQr(e.target.files?.[0]); e.target.value = ''; }} />
                        </label>
                        {methodForm.qrImageUrl && (
                          <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnGhost}`} disabled={qrBusy} onClick={removeQr}>Remove</button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className={s.hint}>Save first, then you can upload the official QR from your bank or wallet app.</span>
                )}
              </div>
            )}
            <label className={s.field}>
              <span className={s.label}>Note for customers (optional)</span>
              <textarea id="method-ins" className={s.textarea} rows={2} value={methodForm.instructions}
                onChange={(e) => setMethodForm({ ...methodForm, instructions: e.target.value })}
                placeholder="Send the exact amount and keep the transaction ID." />
            </label>
            <Switch id="method-active" label="Show this method to customers" checked={methodForm.active}
              onChange={(v) => setMethodForm({ ...methodForm, active: v })} />

          </div>
        )}
      </Modal>

      <Modal open={recordOpen} title="Record a payment" onClose={closeRecord}
        footer={
          <div className={s.btnRow}>
            <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={closeRecord}>Cancel</button>
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={!ticket || !Number(rec.amount) || recBusy} onClick={record}>
              {recBusy ? 'Saving…' : 'Save and issue receipt'}
            </button>
          </div>
        }>
        <div className={s.stack}>
          {recErr && <div className={`${s.alert} ${s.alertErr}`} role="alert">{recErr}</div>}
          <label className={s.field}>
            <span className={s.label}>Booking code</span>
            <div className={s.btnRow}>
              <input id="record-code" className={s.input} value={code} onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void lookup(); }} placeholder="From the customer's ticket, e.g. DEMO0010" />
              <button type="button" className={`${s.btn} ${s.btnSoft}`} onClick={lookup}>Find</button>
            </div>
          </label>
          {ticket && (
            <>
              <div className={s.panel} style={{ padding: 14 }}>
                <div className={s.rowTitle}>{ticket.booking.customerName || 'Customer'} · {ticket.booking.serviceName}</div>
                <div className={s.rowMeta}>
                  {dateLabel(ticket.booking.bookingTime, true)} · Total {money(ticket.total, ticket.booking.currency)} · Paid{' '}
                  {money(ticket.paid, ticket.booking.currency)} · <strong>Due {money(ticket.due, ticket.booking.currency)}</strong>
                </div>
              </div>
              <div className={s.fieldGrid}>
                <label className={s.field}>
                  <span className={s.label}>Amount received</span>
                  <input id="record-amount" className={s.input} inputMode="decimal" value={rec.amount}
                    onChange={(e) => setRec({ ...rec, amount: e.target.value })} />
                </label>
                <label className={s.field}>
                  <span className={s.label}>Paid by</span>
                  <Dropdown id="record-method" aria-label="Paid by" value={rec.methodType}
                    onChange={(v) => setRec({ ...rec, methodType: v as MethodType })} options={ALL_METHODS.map((m) => ({ value: m, label: METHOD_LABEL[m], icon: METHOD_ICON[m] }))} />

                </label>
                <label className={`${s.field} ${s.fieldFull}`}>
                  <span className={s.label}>Transaction ID (optional)</span>
                  <input id="record-ref" className={s.input} value={rec.reference} onChange={(e) => setRec({ ...rec, reference: e.target.value })} />
                </label>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

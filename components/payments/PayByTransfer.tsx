'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
  METHOD_ICON, METHOD_LABEL, REMOTE_METHODS, money, qrText,
  type BookingTicket, type PaymentMethod,
} from '@/lib/payments';
import TicketQr from './TicketQr';
import s from '@/components/workspace/tools.module.css';
import p from './pay.module.css';

const MAX_MB = 8;

function errText(e: unknown, fallback: string) {
  return (e as { message?: string })?.message || fallback;
}

function CopyRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <div className={p.detail}>
      <span>{label}</span>
      <strong className={mono ? p.mono : undefined}>{value}</strong>
      <button type="button" className={`${p.copy} ${done ? p.copied : ''}`} aria-label={`Copy ${label}`}
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(() => {
            setDone(true);
            setTimeout(() => setDone(false), 1600);
          });
        }}>
        {done ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

/** Where to send the money: one account at a time, with its QR and copyable details. */
function AccountCard({ m, amount }: { m: PaymentMethod; amount: string }) {
  const numberLabel = m.methodType === 'BANK_TRANSFER' ? 'Account no.' : m.methodType === 'RAAST' ? 'Raast ID' : 'Wallet no.';
  const hasDetails = !!(m.accountNumber || m.iban);
  return (
    <div className={p.account}>
      <div className={p.qr}>
        {m.qrImageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- business-uploaded QR */}
            <img src={m.qrImageUrl} alt={`${METHOD_LABEL[m.methodType]} QR code`} />
            Scan in your banking or wallet app
          </>
        ) : hasDetails ? (
          <>
            <TicketQr code={qrText(m, amount)} size={168} alt={`${METHOD_LABEL[m.methodType]} account details`} />
            Scan to copy the account details
          </>
        ) : null}
      </div>
      <div className={p.details}>
        {m.accountTitle && <CopyRow label="Account title" value={m.accountTitle} />}
        {m.bankName && <CopyRow label="Bank" value={m.bankName} />}
        {m.iban && <CopyRow label="IBAN" value={m.iban} mono />}
        {m.accountNumber && <CopyRow label={numberLabel} value={m.accountNumber} mono />}
        <CopyRow label="Amount" value={amount} />
        {m.instructions && <p className={p.note}><i className="fa-solid fa-circle-info" /> {m.instructions}</p>}
      </div>
    </div>
  );
}

/** Step 1: the business's accounts, one chosen at a time. */
export function TransferAccounts({ methods, amountLabel, methodId, onMethod }: {
  methods: PaymentMethod[];
  amountLabel: string;
  methodId: number | null;
  onMethod: (id: number) => void;
}) {
  const remote = methods.filter((m) => REMOTE_METHODS.includes(m.methodType));
  const method = remote.find((m) => m.id === methodId) ?? remote[0];
  if (!method) return null;
  return (
    <>
      <strong style={{ display: 'flex', alignItems: 'center' }}><span className={p.stepNo}>1</span>Send {amountLabel} to</strong>
      {remote.length > 1 && (
        <div className={p.methods} role="radiogroup" aria-label="Pay with">
          {remote.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={m.id === method.id}
              className={`${p.methodBtn} ${m.id === method.id ? p.methodOn : ''}`} onClick={() => onMethod(m.id)}>
              <i className={`fa-solid ${METHOD_ICON[m.methodType]}`} /> {METHOD_LABEL[m.methodType]}
              {m.methodType === 'BANK_TRANSFER' && m.bankName ? ` · ${m.bankName}` : ''}
            </button>
          ))}
        </div>
      )}
      <AccountCard m={method} amount={amountLabel} />
    </>
  );
}

export type ProofValue = { file: File | null; amount: string; reference: string };

/** Step 2: the screenshot (required) and transaction ID (optional). */
export function ProofPicker({ value, onChange, currency, showAmount = true }: {
  value: ProofValue;
  onChange: (v: ProofValue) => void;
  currency: string;
  showAmount?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const file = value.file;

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL tied to the chosen file
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(f: File | undefined | null) {
    setError(null);
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
      setError('Upload the screenshot as a JPG, PNG or WebP image.');
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`The screenshot must be ${MAX_MB} MB or smaller.`);
      return;
    }
    onChange({ ...value, file: f });
  }

  return (
    <>
      <div className={p.steps}>
        <strong style={{ display: 'flex', alignItems: 'center' }}><span className={p.stepNo}>2</span>Upload the payment screenshot</strong>
        <span className={s.hint}>Take a screenshot of the success screen in your app, showing the amount and the receiver.</span>
      </div>

      {error && <div className={`${s.alert} ${s.alertErr}`} role="alert"><i className="fa-solid fa-circle-exclamation" /> {error}</div>}

      {file && preview ? (
        <div className={p.preview}>
          {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
          <img src={preview} alt="Your payment screenshot" />
          <div>
            <strong>{file.name}</strong>
            <span className={s.hint}>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
          </div>
          <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnGhost}`} onClick={() => { onChange({ ...value, file: null }); setPreview(null); }}>
            Change
          </button>
        </div>
      ) : (
        <label className={`${p.drop} ${over ? p.dropOver : ''}`}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); }}>
          <i className="fa-solid fa-image" aria-hidden />
          <strong>Choose screenshot</strong>
          <span className={s.hint}>or drop it here · JPG, PNG or WebP up to {MAX_MB} MB</span>
          <input id="pay-proof" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Payment screenshot (required)"
            onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      )}

      <div className={s.fieldGrid}>
        {showAmount && (
          <label className={s.field}>
            <span className={s.label}>Amount you sent ({currency})</span>
            <input id="pay-amount" className={s.input} inputMode="decimal" value={value.amount}
              onChange={(e) => onChange({ ...value, amount: e.target.value })} />
          </label>
        )}
        <label className={s.field}>
          <span className={s.label}>Transaction ID (optional)</span>
          <input id="pay-ref" className={s.input} value={value.reference} onChange={(e) => onChange({ ...value, reference: e.target.value })}
            placeholder="Helps the business find it faster" />
        </label>
      </div>
    </>
  );
}

/** Sends a payment screenshot for a booking. */
export async function sendProof(bookingId: number, methodType: string, proof: ProofValue) {
  const form = new FormData();
  form.append('methodType', methodType);
  form.append('amount', proof.amount);
  if (proof.reference.trim()) form.append('reference', proof.reference.trim());
  if (proof.file) form.append('proof', proof.file);
  return apiFetch<BookingTicket>(`/api/customer/bookings/${bookingId}/payments`, { method: 'POST', body: form });
}

/**
 * On a booking that still needs paying (e.g. the upload failed, or a payment was rejected): pay the business
 * directly and upload the screenshot. The business checks its account and confirms.
 */
export default function PayByTransfer({ ticket, onSent }: { ticket: BookingTicket; onSent: (t: BookingTicket, note: string) => void }) {
  const b = ticket.booking;
  const cur = b.currency || 'PKR';
  const remote = useMemo(() => ticket.paymentMethods.filter((m) => REMOTE_METHODS.includes(m.methodType)), [ticket.paymentMethods]);
  const [methodId, setMethodId] = useState<number | null>(remote[0]?.id ?? null);
  const method = remote.find((m) => m.id === methodId) ?? remote[0];
  const [proof, setProof] = useState<ProofValue>({ file: null, amount: Number(ticket.due) > 0 ? String(Number(ticket.due)) : '', reference: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!method || !proof.file) return;
    setBusy(true);
    setError(null);
    try {
      const t = await sendProof(b.id, method.methodType, proof);
      setProof({ ...proof, file: null, reference: '' });
      onSent(t, `Sent to ${b.businessName}. We'll email you as soon as they confirm your payment.`);
    } catch (e) {
      setError(errText(e, 'Could not send your payment. Try again.'));
    } finally {
      setBusy(false);
    }
  }

  if (remote.length === 0) return null;

  return (
    <section className={s.panel} aria-labelledby="pay-title">
      <div className={s.panelHead}>
        <div className={s.panelHeadText}>
          <h2 id="pay-title">Pay {b.businessName}</h2>
          <p>Send the money from your own bank or wallet app, straight to {b.businessName}. Duemet never takes your money.</p>
        </div>
      </div>
      <div className={s.panelBody} style={{ display: 'grid', gap: 18 }}>
        <TransferAccounts methods={remote} amountLabel={money(proof.amount || ticket.due, cur)} methodId={method?.id ?? null} onMethod={setMethodId} />
        {error && <div className={`${s.alert} ${s.alertErr}`} role="alert"><i className="fa-solid fa-circle-exclamation" /> {error}</div>}
        <ProofPicker value={proof} onChange={setProof} currency={cur} />
      </div>
      <div className={s.panelFoot}>
        <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={busy || !proof.file || !Number(proof.amount) || !method} onClick={send}>
          {busy ? 'Sending…' : <><i className="fa-solid fa-paper-plane" /> Send payment for checking</>}
        </button>
        {!proof.file && <span className={s.hint}>Add the screenshot to continue.</span>}
      </div>
    </section>
  );
}

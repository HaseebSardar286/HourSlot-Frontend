'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { apiFetch } from '@/lib/api';
import { useOrgLocale } from '@/lib/org-locale-context';
import s from '@/components/workspace/tools.module.css';

type Policy = {
  freeCancelHours: number;
  lateCancelFeePercent: number;
  noShowFeePercent: number;
  prepayAfterNoShows: number;
  policyText?: string | null;
};

type OwedFee = {
  bookingId: number;
  kind: string;
  feeAmount: number;
  createdAt: string;
};

/** Plain-language summary of the policy, as customers will read it. */
function summarize(p: Policy) {
  const parts: string[] = [];
  parts.push(
    p.freeCancelHours > 0
      ? `Free cancellation up to ${p.freeCancelHours} hour${p.freeCancelHours === 1 ? '' : 's'} before the appointment.`
      : 'Customers can cancel for free at any time.'
  );
  if (p.lateCancelFeePercent > 0) parts.push(`Later cancellations: ${p.lateCancelFeePercent}% fee.`);
  if (p.noShowFeePercent > 0) parts.push(`No-shows: ${p.noShowFeePercent}% fee.`);
  if (p.prepayAfterNoShows > 0)
    parts.push(`After ${p.prepayAfterNoShows} no-show${p.prepayAfterNoShows === 1 ? '' : 's'}, a customer must pay online to book.`);
  return parts.join(' ');
}

/**
 * Owner booking settings: shareable booking link with QR, cancellation / no-show policy,
 * fees owed and calendar sync. Rendered in the left column (main) and right column (side)
 * of the Booking tools page; `slot` picks which part to render.
 */
export default function BookingTools({ bookingUrl, slot }: { bookingUrl: string | null; slot: 'main' | 'side' }) {
  const { format } = useOrgLocale();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [fees, setFees] = useState<OwedFee[]>([]);
  const [feed, setFeed] = useState<{ url: string; webcalUrl: string } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (slot !== 'main') return;
    try {
      const [p, f] = await Promise.all([
        apiFetch<Policy>('/api/provider-tools/policy'),
        apiFetch<OwedFee[]>('/api/provider-tools/fees'),
      ]);
      setPolicy(p);
      setFees(f || []);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not load booking settings.');
    }
  }, [slot]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (!bookingUrl || slot !== 'side') return;
    QRCode.toDataURL(bookingUrl, { width: 320, margin: 0, color: { dark: '#0b1428', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [bookingUrl, slot]);

  const flash = (msg: string) => {
    setMessage(msg);
    window.setTimeout(() => setMessage((m) => (m === msg ? null : m)), 3000);
  };

  const run = async (fn: () => Promise<void>, success: string) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
      flash(success);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const savePolicy = (e: FormEvent) => {
    e.preventDefault();
    if (!policy) return;
    void run(async () => {
      setPolicy(await apiFetch<Policy>('/api/provider-tools/policy', { method: 'PUT', body: JSON.stringify(policy) }));
    }, 'Policy saved. Customers see it before they book.');
  };

  const set = (patch: Partial<Policy>) => setPolicy((p) => (p ? { ...p, ...patch } : p));

  const copy = (text: string, what: string) => {
    void navigator.clipboard?.writeText(text).then(() => flash(`${what} copied.`));
  };

  const alerts = (
    <>
      {message && <div className={`${s.alert} ${s.alertOk}`} role="status"><i className="fa-solid fa-circle-check" /> {message}</div>}
      {error && <div className={`${s.alert} ${s.alertErr}`} role="alert"><i className="fa-solid fa-circle-exclamation" /> {error}</div>}
    </>
  );

  if (slot === 'side') {
    return (
      <div className={s.stack}>
        {alerts}
        <section className={s.panel}>
          <div className={s.linkHero}>
            <h2>Your booking link</h2>
            <p>Share it on WhatsApp, Instagram or Facebook, or print the QR code for your counter, shop or van.</p>
            {qr ? (
              <div className={s.qrFrame}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="QR code for your booking link" />
              </div>
            ) : (
              <div className={s.qrFrame}><div className={s.skel} style={{ width: 160, height: 160 }} /></div>
            )}
          </div>
          <div className={s.panelBody}>
            {bookingUrl ? (
              <>
                <div className={s.urlField}>
                  <code title={bookingUrl}>{bookingUrl.replace(/^https?:\/\//, '')}</code>
                  <button type="button" className={s.iconBtn} onClick={() => copy(bookingUrl, 'Link')} aria-label="Copy booking link">
                    <i className="fa-regular fa-copy" />
                  </button>
                </div>
                <div className={s.btnRow}>
                  <a
                    className={`${s.btn} ${s.btnWhatsapp}`}
                    style={{ flex: 1 }}
                    href={`https://wa.me/?text=${encodeURIComponent(`Book with us on Duemet: ${bookingUrl}`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <i className="fa-brands fa-whatsapp" /> Share
                  </a>
                  {qr && (
                    <a className={s.btn} style={{ flex: 1 }} href={qr} download="duemet-booking-qr.png">
                      <i className="fa-solid fa-download" /> QR code
                    </a>
                  )}
                  <a className={`${s.btn} ${s.btnGhost}`} href={bookingUrl} target="_blank" rel="noreferrer" aria-label="Open your public page">
                    <i className="fa-solid fa-arrow-up-right-from-square" />
                  </a>
                </div>
              </>
            ) : (
              <p className={s.hint}>Your link appears once your listing has a public address.</p>
            )}
          </div>
        </section>

        <section className={s.panel}>
          <div className={s.panelHead}>
            <span className={`${s.iconTile} ${s.toneViolet}`}><i className="fa-solid fa-calendar-plus" /></span>
            <div className={s.panelHeadText}>
              <h2>Calendar sync</h2>
              <p>See bookings in Google Calendar, Outlook or Apple Calendar. Updates every few hours. Keep the link private.</p>
            </div>
          </div>
          <div className={s.panelBody}>
            {feed ? (
              <>
                <div className={s.urlField}>
                  <code title={feed.url}>{feed.url.replace(/^https?:\/\//, '')}</code>
                  <button type="button" className={s.iconBtn} onClick={() => copy(feed.url, 'Calendar link')} aria-label="Copy calendar link">
                    <i className="fa-regular fa-copy" />
                  </button>
                </div>
                <div className={s.btnRow}>
                  <a className={s.btn} style={{ flex: 1 }} target="_blank" rel="noreferrer"
                    href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feed.webcalUrl)}`}>
                    <i className="fa-brands fa-google" /> Google
                  </a>
                  <a className={s.btn} style={{ flex: 1 }} href={feed.webcalUrl}>
                    <i className="fa-solid fa-calendar" /> Calendar app
                  </a>
                </div>
                <button
                  type="button"
                  className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
                  disabled={saving}
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() => {
                    if (!window.confirm('Make a new link? The old one stops working in calendars that use it.')) return;
                    void run(async () => {
                      setFeed(await apiFetch('/api/provider-tools/calendar-feed/rotate', { method: 'POST' }));
                    }, 'New calendar link created.');
                  }}
                >
                  <i className="fa-solid fa-rotate" /> Reset link
                </button>
              </>
            ) : (
              <button
                type="button"
                className={`${s.btn} ${s.btnSoft} ${s.btnBlock}`}
                disabled={saving}
                onClick={() => void run(async () => {
                  setFeed(await apiFetch('/api/provider-tools/calendar-feed'));
                }, 'Calendar link ready.')}
              >
                <i className="fa-solid fa-link" /> Get calendar link
              </button>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <>
      {alerts}

      <form className={s.panel} onSubmit={savePolicy}>
        <div className={s.panelHead}>
          <span className={`${s.iconTile} ${s.toneAmber}`}><i className="fa-solid fa-shield-halved" /></span>
          <div className={s.panelHeadText}>
            <h2>Cancellation &amp; no-show policy</h2>
            <p>Fees are recorded as owed and collected at the next visit. Nothing is charged automatically.</p>
          </div>
        </div>
        {policy ? (
          <>
            <div className={s.panelBody}>
              <div className={s.fieldGrid}>
                <label className={s.field}>
                  <span className={s.label}>Free cancellation window</span>
                  <span className={s.affix}>
                    <input type="number" min={0} max={168} value={policy.freeCancelHours}
                      onChange={(e) => set({ freeCancelHours: Number(e.target.value) })} />
                    <span>hours before</span>
                  </span>
                </label>
                <label className={s.field}>
                  <span className={s.label}>Late-cancellation fee</span>
                  <span className={s.affix}>
                    <input type="number" min={0} max={100} value={policy.lateCancelFeePercent}
                      onChange={(e) => set({ lateCancelFeePercent: Number(e.target.value) })} />
                    <span>% of price</span>
                  </span>
                </label>
                <label className={s.field}>
                  <span className={s.label}>No-show fee</span>
                  <span className={s.affix}>
                    <input type="number" min={0} max={100} value={policy.noShowFeePercent}
                      onChange={(e) => set({ noShowFeePercent: Number(e.target.value) })} />
                    <span>% of price</span>
                  </span>
                </label>
                <label className={s.field}>
                  <span className={s.label}>Require prepayment after</span>
                  <span className={s.affix}>
                    <input type="number" min={0} max={10} value={policy.prepayAfterNoShows}
                      onChange={(e) => set({ prepayAfterNoShows: Number(e.target.value) })} />
                    <span>no-shows</span>
                  </span>
                  <span className={s.hint}>0 means never.</span>
                </label>
                <label className={`${s.field} ${s.fieldFull}`}>
                  <span className={s.label}>Message to customers <span className={s.hint}>(optional)</span></span>
                  <textarea className={s.textarea} rows={3} maxLength={2000} value={policy.policyText || ''}
                    placeholder="e.g. Please cancel at least 24 hours ahead so we can offer the slot to someone else."
                    onChange={(e) => set({ policyText: e.target.value })} />
                </label>
              </div>
              <div className={s.preview}>
                <i className="fa-solid fa-eye" aria-hidden />
                <span><strong>Customers see:</strong> {summarize(policy)}</span>
              </div>
            </div>
            <div className={s.panelFoot}>
              <p>Applies to new bookings.</p>
              <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>
                {saving ? <span className="spinner" /> : <i className="fa-solid fa-check" />} Save policy
              </button>
            </div>
          </>
        ) : (
          <div className={s.panelBody}>
            <div className={s.skel} style={{ height: 42 }} />
            <div className={s.skel} style={{ height: 42 }} />
          </div>
        )}
      </form>

      <section className={s.panel}>
        <div className={s.panelHead}>
          <span className={`${s.iconTile} ${s.toneRose}`}><i className="fa-solid fa-receipt" /></span>
          <div className={s.panelHeadText}>
            <h2>Fees owed {fees.length > 0 && <span className={`${s.chip} ${s.chipRose}`} style={{ marginLeft: 6 }}>{fees.length} open</span>}</h2>
            <p>Late cancellations and no-shows under your policy. Mark them when collected or waived.</p>
          </div>
        </div>
        <div style={{ paddingTop: 12 }}>
          {fees.length === 0 ? (
            <div className={s.empty}>
              <i className="fa-regular fa-circle-check" />
              No open fees.
            </div>
          ) : (
            <div className={s.list} style={{ borderTop: '1px solid var(--border-color)' }}>
              {fees.map((f) => (
                <div key={f.bookingId} className={s.row}>
                  <div className={s.rowMain}>
                    <div className={s.rowTitle}>
                      Booking #{f.bookingId}
                      <span className={`${s.chip} ${f.kind === 'NO_SHOW' ? s.chipRose : s.chipAmber}`}>
                        {f.kind === 'NO_SHOW' ? 'No-show' : 'Late cancellation'}
                      </span>
                    </div>
                    <div className={s.rowMeta}>Recorded {new Date(f.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                  <div className={s.rowEnd}>
                    <span className={s.amount}>{format(f.feeAmount)}</span>
                    {(['collected', 'waived'] as const).map((action) => (
                      <button key={action} type="button" disabled={saving}
                        className={`${s.btn} ${s.btnSm} ${action === 'collected' ? s.btnSoft : s.btnGhost}`}
                        onClick={() => void run(async () => {
                          await apiFetch(`/api/provider-tools/fees/${f.bookingId}/${action}`, { method: 'POST' });
                          await load();
                        }, action === 'collected' ? 'Marked as collected.' : 'Fee waived.')}>
                        {action === 'collected' ? 'Collected' : 'Waive'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

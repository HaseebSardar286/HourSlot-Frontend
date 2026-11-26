'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { errMsg } from '@/lib/ops';
import s from '@/components/workspace/tools.module.css';

type Info = { status: string; time: string; reply?: 'CONFIRMED' | 'DECLINED' | null; cancelFee?: number; cancelLate?: boolean; currency?: string };

/**
 * On the customer's booking page for upcoming visits: "I'll be there" tells the business you are coming;
 * "I can't make it" cancels and frees the slot.
 */
export default function AttendanceBar({ bookingId, onChanged }: { bookingId: number | string; onChanged?: () => void }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [upcoming, setUpcoming] = useState(false);

  useEffect(() => {
    apiFetch<Info>(`/api/customer/bookings/${bookingId}/attendance`)
      .then((d) => { setInfo(d); setUpcoming(new Date(d.time).getTime() > Date.now()); })
      .catch(() => setInfo(null));
  }, [bookingId]);

  const answer = async (yes: boolean) => {
    setBusy(true);
    setError(null);
    try {
      setInfo(await apiFetch<Info>(`/api/customer/bookings/${bookingId}/attendance/${yes ? 'yes' : 'no'}`, { method: 'POST' }));
      setConfirming(false);
      onChanged?.();
    } catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  };

  if (!info || !(info.status === 'CONFIRMED' || info.status === 'PENDING') || !upcoming) return null;

  return (
    <section className={s.panel}>
      <div className={s.panelHead}>
        <span className={`${s.iconTile} ${info.reply === 'CONFIRMED' ? s.toneGreen : ''}`}><i className={`fa-solid ${info.reply === 'CONFIRMED' ? 'fa-circle-check' : 'fa-calendar-check'}`} /></span>
        <div className={s.panelHeadText}>
          <h2>{info.reply === 'CONFIRMED' ? "You've confirmed you're coming" : 'Are you still coming?'}</h2>
          <p>{info.reply === 'CONFIRMED' ? 'Thanks. If plans change, cancel here so someone else can take the slot.' : 'Let the business know, or cancel to free the slot.'}</p>
        </div>
      </div>
      <div className={s.panelBody}>
        {confirming ? (
          <div className={s.btnRow}>
            <span className={s.hint}>
              Cancel this booking?{info.cancelLate && Number(info.cancelFee) > 0 ? ` A late cancellation fee of ${info.currency} ${info.cancelFee} applies.` : ''}
            </span>
            <button type="button" className={`${s.btn} ${s.btnDanger}`} disabled={busy} onClick={() => answer(false)}>Yes, cancel</button>
            <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => setConfirming(false)}>Keep it</button>
          </div>
        ) : (
          <div className={s.btnRow}>
            {info.reply !== 'CONFIRMED' && (
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={busy} onClick={() => answer(true)}><i className="fa-solid fa-check" /> I&apos;ll be there</button>
            )}
            <button type="button" className={`${s.btn} ${s.btnGhost}`} disabled={busy} onClick={() => setConfirming(true)}>I can&apos;t make it</button>
          </div>
        )}
        {error && <div className={`${s.alert} ${s.alertErr}`} style={{ marginTop: 10 }}>{error}</div>}
      </div>
    </section>
  );
}

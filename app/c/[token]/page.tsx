'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import p from '@/components/ops/public.module.css';

type Info = {
  code: string; status: string; time: string; reply?: 'CONFIRMED' | 'DECLINED' | null; businessName: string; branchName?: string;
  address?: string; serviceName?: string; staffName?: string; cancelFee?: number; cancelLate?: boolean; currency?: string;
};

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true });

/** The reminder email's "I'll be there / I can't make it" link. No login needed; the link itself is the key. */
export default function ConfirmAttendance() {
  const { token } = useParams<{ token: string }>();
  const answer = useSearchParams().get('answer');
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const autoDone = useRef(false);

  const reply = async (yes: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/public/attendance/${encodeURIComponent(token)}/${yes ? 'yes' : 'no'}`, { method: 'POST' });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.message || 'Could not save your answer.');
      setInfo(body);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    fetch(`/api/public/attendance/${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('This link is no longer valid.'))))
      .then((d: Info) => {
        setInfo(d);
        // "I'll be there" from the email is saved straight away; cancelling always asks first.
        if (answer === 'yes' && !autoDone.current && !d.reply && (d.status === 'CONFIRMED' || d.status === 'PENDING')) {
          autoDone.current = true;
          void reply(true);
        }
      })
      .catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const open = info && (info.status === 'CONFIRMED' || info.status === 'PENDING');
  return (
    <main className={p.shell}>
      <div className={p.card}>
        <div className={p.brand}>Duemet · Your appointment</div>
        {error && <div className={p.err} role="alert">{error}</div>}
        {info && (
          <>
            <h1>{info.businessName}</h1>
            <div>
              <div className={p.row}><span>When</span><strong>{when(info.time)}</strong></div>
              {info.serviceName && <div className={p.row}><span>Service</span><strong>{info.serviceName}</strong></div>}
              {info.staffName && <div className={p.row}><span>With</span><strong>{info.staffName}</strong></div>}
              {info.branchName && <div className={p.row}><span>Where</span><strong>{info.branchName}</strong></div>}
              <div className={p.row}><span>Booking</span><strong>{info.code}</strong></div>
            </div>
            {info.reply === 'CONFIRMED' && open && <div className={p.ok}>Thanks, you&apos;re confirmed. See you then!</div>}
            {info.status === 'CANCELLED' && <div className={p.ok}>Your booking is cancelled and the slot is free for someone else.</div>}
            {open && (
              <div className={p.actions}>
                {info.reply !== 'CONFIRMED' && (
                  <button type="button" className={`${p.btn} ${p.primary}`} disabled={busy} onClick={() => reply(true)}>I&apos;ll be there</button>
                )}
                <button type="button" className={`${p.btn} ${p.danger}`} disabled={busy} onClick={() => reply(false)}>I can&apos;t make it, cancel</button>
                {info.cancelLate && Number(info.cancelFee) > 0 && (
                  <div className={p.muted}>Cancelling this late has a fee of {info.currency} {info.cancelFee} under the business&apos;s policy.</div>
                )}
              </div>
            )}
            {!open && info.status !== 'CANCELLED' && <p>This booking is {info.status.toLowerCase().replace('_', ' ')}.</p>}
          </>
        )}
      </div>
    </main>
  );
}

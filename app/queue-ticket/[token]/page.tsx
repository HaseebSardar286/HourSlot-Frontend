'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import p from '@/components/ops/public.module.css';

type Ticket = {
  ticket: number; name: string; status: 'WAITING' | 'SERVING' | 'DONE' | 'LEFT'; serviceName?: string; businessName: string;
  staffName?: string; position?: number; estimatedWaitMinutes?: number; estimatedStart?: string;
};

const hm = (iso?: string) => {
  if (!iso) return '';
  const [h, m] = iso.slice(11, 16).split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

/** A walk-in follows their place in the queue. Refreshes every 20 seconds. */
export default function QueueTicket() {
  const { token } = useParams<{ token: string }>();
  const [t, setT] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => fetch(`/api/public/queue-ticket/${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Ticket not found.'))))
      .then((d: Ticket) => { setT(d); setError(null); })
      .catch((e: Error) => setError(e.message));
    void load();
    const i = window.setInterval(load, 20000);
    return () => window.clearInterval(i);
  }, [token]);

  const leave = async () => {
    await fetch(`/api/public/queue-ticket/${encodeURIComponent(token)}/leave`, { method: 'POST' });
    setT((x) => (x ? { ...x, status: 'LEFT' } : x));
  };

  return (
    <main className={p.shell}>
      <div className={p.card} aria-live="polite">
        <div className={p.brand}>{t?.businessName || 'Duemet'} · Queue</div>
        {error && <div className={p.err}>{error}</div>}
        {t && (
          <>
            <div className={p.big}><span>Your ticket</span><strong>#{t.ticket}</strong></div>
            {t.status === 'WAITING' && (
              <>
                <h1>{t.position === 1 ? "You're next" : `${(t.position || 1) - 1} ahead of you`}</h1>
                <div className={p.facts}>
                  <div className={p.fact}><span>Estimated wait</span><strong>{t.estimatedWaitMinutes != null ? `${t.estimatedWaitMinutes} min` : '—'}</strong></div>
                  <div className={p.fact}><span>Around</span><strong>{t.estimatedStart ? hm(t.estimatedStart) : '—'}</strong></div>
                </div>
                <p>Stay nearby; this page updates on its own. {t.serviceName ? `Service: ${t.serviceName}.` : ''}</p>
                <button type="button" className={`${p.btn} ${p.danger}`} onClick={leave}>I&apos;m leaving the queue</button>
              </>
            )}
            {t.status === 'SERVING' && <div className={p.ok}>It&apos;s your turn{t.staffName ? ` with ${t.staffName}` : ''}. Please come to the desk.</div>}
            {t.status === 'DONE' && <div className={p.ok}>Thanks for visiting, {t.name}!</div>}
            {t.status === 'LEFT' && <p>You left the queue. Scan the QR again if you change your mind.</p>}
          </>
        )}
      </div>
    </main>
  );
}

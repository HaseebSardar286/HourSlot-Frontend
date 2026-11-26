'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import TicketQr from '@/components/payments/TicketQr';
import p from '@/components/ops/public.module.css';

type Ticket = { ticket: number; name: string };
type BoardData = { businessName: string; serving: Ticket[]; waiting: Ticket[]; waitingCount: number; estimatedWaitMinutes: number };

/** "Now serving" screen for a TV or tablet at the counter. Refreshes itself. */
export default function QueueScreen() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
    const load = () => fetch(`/api/public/queue/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Queue not found.'))))
      .then((d: BoardData) => { setData(d); setError(null); })
      .catch((e: Error) => setError(e.message));
    void load();
    const t = window.setInterval(load, 10000);
    const c = window.setInterval(() => setNow(new Date()), 15000);
    return () => { window.clearInterval(t); window.clearInterval(c); };
  }, [slug]);

  return (
    <div className={p.tv}>
      <div className={p.tvHead}>
        <h1>{data?.businessName || 'Queue'}</h1>
        <div className={p.tvClock}>{now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
      </div>
      {error ? <div className={p.err}>{error}</div> : (
        <div className={p.tvCols}>
          <section className={p.tvPanel}>
            <h2>Now serving</h2>
            {(data?.serving || []).length === 0 ? <div style={{ color: '#c9d6f2', fontSize: '1.2rem' }}>Next customer shortly</div>
              : data!.serving.map((t) => (
                <div key={t.ticket} className={p.tvNow}><strong>{t.ticket}</strong><span>{t.name}</span></div>
              ))}
          </section>
          <section className={p.tvPanel}>
            <h2>Waiting · about {data?.estimatedWaitMinutes ?? 0} min</h2>
            {(data?.waiting || []).length === 0 ? <div style={{ color: '#c9d6f2', fontSize: '1.2rem' }}>No one waiting</div> : (
              <div className={p.tvList}>
                {data!.waiting.map((t) => <div key={t.ticket} className={p.tvItem}><strong>#{t.ticket}</strong><span>{t.name}</span></div>)}
              </div>
            )}
          </section>
        </div>
      )}
      <div className={p.tvFoot}>
        <span>Walked in? Scan to join the queue and get your wait on your phone.</span>
        {origin && <div className={p.tvQr}><TicketQr code={`${origin}/q/${slug}/join`} size={96} /> Join the queue</div>}
      </div>
    </div>
  );
}

'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Dropdown from '@/components/ui/Dropdown';
import p from '@/components/ops/public.module.css';

/** Walk-in customers join the queue from the QR at the door. */
export default function JoinQueue() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [info, setInfo] = useState<{ businessName: string; services: { id: number; name: string }[] } | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/public/queue/${encodeURIComponent(slug)}/join`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('This business was not found.'))))
      .then(setInfo)
      .catch((e: Error) => setError(e.message));
  }, [slug]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/public/queue/${encodeURIComponent(slug)}/join`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone: phone || null, serviceId: serviceId ? Number(serviceId) : null }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.message || 'Could not join the queue.');
      try { localStorage.setItem(`duemet-queue-${slug}`, body.token); } catch { /* private mode */ }
      router.push(`/queue-ticket/${body.token}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className={p.shell}>
      <form className={p.card} onSubmit={submit}>
        <div className={p.brand}>Duemet · Walk-in queue</div>
        <h1>{info ? `Join the queue at ${info.businessName}` : 'Join the queue'}</h1>
        <p>Add your name and we&apos;ll show your place in line and roughly how long you&apos;ll wait.</p>
        <label className={p.label}>Your name
          <input className={p.input} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required autoComplete="given-name" />
        </label>
        <label className={p.label}>Phone (optional)
          <input className={p.input} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        </label>
        {info && info.services.length > 0 && (
          <div className={p.label}>What would you like?
            <Dropdown aria-label="Service" value={serviceId} onChange={setServiceId} icon="fa-scissors"
              options={[{ value: '', label: 'Not sure yet' }, ...info.services.map((s) => ({ value: String(s.id), label: s.name }))]} />
          </div>
        )}
        {error && <div className={p.err} role="alert">{error}</div>}
        <button type="submit" className={`${p.btn} ${p.primary}`} disabled={busy || !name.trim() || !info}>
          {busy ? 'Joining…' : 'Join the queue'}
        </button>
        <div className={p.muted}>Your name is shown on the screen as first name and initial.</div>
      </form>
    </main>
  );
}

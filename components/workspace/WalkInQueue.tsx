'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { WORKSPACE_API, fetchWorkspaceSlug, type Workspace } from '@/lib/workspace-api';
import s from './tools.module.css';

import Dropdown from '@/components/ui/Dropdown';
type Entry = {
  id: number;
  ticket_number: number;
  customer_name: string;
  phone?: string | null;
  service_name?: string | null;
  status: 'WAITING' | 'SERVING' | 'DONE' | 'LEFT';
  created_at: string;
};

type Service = { id: number; name: string };

function minutesSince(iso: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

function waitLabel(min: number) {
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

/** Walk-in queue: add people who turn up without a booking and call them in order. */
export default function WalkInQueue({ workspace }: { workspace: Workspace }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [slug, setSlug] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      setEntries(await apiFetch<Entry[]>('/api/provider-tools/queue'));
      setNow(Date.now());
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Could not load the queue.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    apiFetch<Service[]>(WORKSPACE_API[workspace].services).then(setServices).catch(() => setServices([]));
    void fetchWorkspaceSlug(workspace).then(setSlug);
    const timer = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(timer);
  }, [load, workspace]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    void act(async () => {
      await apiFetch('/api/provider-tools/queue', {
        method: 'POST',
        body: JSON.stringify({ name, phone: phone || null, serviceId: serviceId ? Number(serviceId) : null }),
      });
      setName('');
      setPhone('');
      setServiceId('');
    });
  };

  const waiting = entries.filter((e) => e.status === 'WAITING');
  const serving = entries.filter((e) => e.status === 'SERVING');
  const done = entries.filter((e) => e.status === 'DONE').length;
  const left = entries.filter((e) => e.status === 'LEFT').length;
  const longest = waiting.length ? minutesSince(waiting[0].created_at, now) : 0;
  const setStatus = (id: number, status: string) =>
    act(() => apiFetch(`/api/provider-tools/queue/${id}/${status}`, { method: 'PUT' }));

  const stats = [
    { label: 'Waiting', value: waiting.length, icon: 'fa-user-clock', tone: '' },
    { label: 'Now serving', value: serving.length, icon: 'fa-chair', tone: s.toneViolet },
    { label: 'Served today', value: done, icon: 'fa-circle-check', tone: s.toneGreen },
    { label: 'Longest wait', value: waiting.length ? waitLabel(longest) : '—', icon: 'fa-hourglass-half', tone: longest >= 30 ? s.toneAmber : s.toneSlate },
  ];

  return (
    <div className={s.page}>
      <header className={s.head}>
        <div>
          <h1>Walk-in queue</h1>
          <p>For customers who turn up without a booking. Add them, call them in order, and show the queue on a screen at your counter.</p>
        </div>
        <div className={s.headActions}>
          {slug && (
            <a className={s.btn} href={`/q/${encodeURIComponent(slug)}`} target="_blank" rel="noreferrer">
              <i className="fa-solid fa-tv" /> Open queue screen
            </a>
          )}
          <button
            type="button"
            className={`${s.btn} ${s.btnPrimary} ${s.callNext}`}
            disabled={busy || waiting.length === 0}
            onClick={() => void act(() => apiFetch('/api/provider-tools/queue/next', { method: 'POST' }))}
          >
            <i className="fa-solid fa-bullhorn" /> Call next{waiting.length ? ` · #${waiting[0].ticket_number}` : ''}
          </button>
        </div>
      </header>

      <div className={s.stats}>
        {stats.map((st) => (
          <div key={st.label} className={s.stat}>
            <span className={`${s.iconTile} ${st.tone}`}><i className={`fa-solid ${st.icon}`} /></span>
            <div className={s.statText}>
              <div className={s.statLabel}>{st.label}</div>
              <div className={s.statValue}>{loaded ? st.value : '…'}</div>
            </div>
          </div>
        ))}
      </div>

      {error && <div className={`${s.alert} ${s.alertErr}`} role="alert"><i className="fa-solid fa-circle-exclamation" /> {error}</div>}

      <form onSubmit={add} className={s.panel}>
        <div className={s.panelBody}>
          <div className={s.addBar}>
            <label className={s.field}>
              <span className={s.label}>Customer name</span>
              <input className={s.input} required placeholder="e.g. Ali Raza" value={name} maxLength={120}
                onChange={(e) => setName(e.target.value)} />
            </label>
            <label className={s.field}>
              <span className={s.label}>Phone <span className={s.hint}>(optional)</span></span>
              <input className={s.input} type="tel" placeholder="For a text when it's their turn" value={phone}
                onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className={s.field}>
              <span className={s.label}>Service</span>
              <Dropdown aria-label="Service" value={String(serviceId)} onChange={setServiceId} icon="fa-scissors"
                options={[{ value: '', label: 'Any service' }, ...services.map((sv) => ({ value: String(sv.id), label: sv.name }))]} />
            </label>
            <button type="submit" className={`${s.btn} ${s.btnSoft}`} style={{ height: 42 }} disabled={busy || !name.trim()}>
              <i className="fa-solid fa-plus" /> Add to queue
            </button>
          </div>
        </div>
      </form>

      <div className={s.queueCols}>
        <section className={s.panel}>
          <div className={s.panelHead}>
            <span className={`${s.iconTile} ${s.toneViolet}`}><i className="fa-solid fa-chair" /></span>
            <div className={s.panelHeadText}>
              <h2>Now serving</h2>
              <p>Mark done when the service is finished.</p>
            </div>
          </div>
          <div style={{ paddingTop: 12 }}>
            {serving.length === 0 ? (
              <div className={s.empty}>
                <i className="fa-solid fa-mug-hot" />
                Nobody is being served. Press <strong style={{ display: 'inline' }}>Call next</strong> to start.
              </div>
            ) : (
              <div style={{ borderTop: '1px solid var(--border-color)' }}>
                {serving.map((e) => (
                  <div key={e.id} className={s.serving}>
                    <span className={s.bigTicket}>{e.ticket_number}</span>
                    <div className={s.rowMain}>
                      <div className={s.rowTitle}>{e.customer_name}</div>
                      <div className={s.rowMeta}>
                        {e.service_name || 'Any service'}
                        {e.phone ? ` · ${e.phone}` : ''}
                      </div>
                    </div>
                    <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnSoft}`} disabled={busy}
                      onClick={() => void setStatus(e.id, 'done')}>
                      <i className="fa-solid fa-check" /> Done
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className={s.panel}>
          <div className={s.panelHead}>
            <span className={s.iconTile}><i className="fa-solid fa-people-line" /></span>
            <div className={s.panelHeadText}>
              <h2>Waiting <span className={`${s.chip} ${s.chipBlue}`} style={{ marginLeft: 6 }}>{waiting.length}</span></h2>
              <p>In arrival order. Ticket numbers restart every day.</p>
            </div>
          </div>
          <div style={{ paddingTop: 12 }}>
            {waiting.length === 0 ? (
              <div className={s.empty}>
                <i className="fa-regular fa-face-smile" />
                The queue is empty.
              </div>
            ) : (
              <div className={s.list} style={{ borderTop: '1px solid var(--border-color)' }}>
                {waiting.map((e, i) => {
                  const mins = minutesSince(e.created_at, now);
                  return (
                    <div key={e.id} className={`${s.row} ${i === 0 ? s.nextUp : ''}`}>
                      <span className={s.ticketNo}>{e.ticket_number}</span>
                      <div className={s.rowMain}>
                        <div className={s.rowTitle}>
                          {e.customer_name}
                          {i === 0 && <span className={`${s.chip} ${s.chipBlue}`}>Next</span>}
                        </div>
                        <div className={s.rowMeta}>
                          {e.service_name || 'Any service'}
                          {e.phone ? ` · ${e.phone}` : ''}
                        </div>
                      </div>
                      <div className={s.rowEnd}>
                        <span className={`${s.waitTime} ${mins >= 30 ? s.waitLong : ''}`}>
                          <i className="fa-regular fa-clock" /> {waitLabel(mins)}
                        </span>
                        <button type="button" className={`${s.btn} ${s.btnSm}`} disabled={busy}
                          onClick={() => void setStatus(e.id, 'serving')}>
                          Serve
                        </button>
                        <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnGhost}`} disabled={busy}
                          onClick={() => void setStatus(e.id, 'left')} title="Customer left without being served">
                          Left
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {left > 0 && (
            <div className={s.panelFoot}>
              <p>{left} left today without being served.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Dropdown from '@/components/ui/Dropdown';
import { dur, errMsg, hm, type Board } from '@/lib/ops';
import Dialog from './Dialog';
import s from './ops.module.css';

type Option = { staffId: number; name: string; available: boolean; start?: string; waitMinutes?: number; reason?: string; note?: string };

/**
 * Add a walk-in. As the service and staff are chosen it asks the server who could take them and when,
 * so reception can seat them now or add them to the queue with an honest wait time.
 */
export default function WalkInDialog({ board, onClose, onDone }: { board: Board; onClose: () => void; onDone: (msg: string) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [note, setNote] = useState('');
  const [options, setOptions] = useState<Option[] | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const qs = new URLSearchParams();
    if (serviceId) qs.set('serviceId', serviceId);
    if (staffId) qs.set('staffId', staffId);
    if (board.branchId) qs.set('branchId', String(board.branchId));
    apiFetch<{ minutes: number; options: Option[] }>(`/api/front-desk/walk-ins/suggest?${qs}`)
      .then((r) => {
        if (!alive) return;
        setOptions(r.options);
        setMinutes(r.minutes);
        const first = r.options.find((o) => o.available);
        setPick(first ? first.staffId : null);
      })
      .catch(() => alive && setOptions([]));
    return () => { alive = false; };
  }, [serviceId, staffId, board.branchId]);

  const chosen = options?.find((o) => o.staffId === pick && o.available);
  const canSeatNow = !!chosen && (chosen.waitMinutes ?? 99) <= 5 && !!serviceId;

  const submit = async (seatNow: boolean) => {
    if (!name.trim()) { setError("Enter the customer's name."); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ ticket_number: number }>('/api/front-desk/walk-ins', {
        method: 'POST',
        body: JSON.stringify({
          name, phone: phone || null, note: note || null,
          serviceId: serviceId ? Number(serviceId) : null,
          staffId: seatNow ? pick : staffId ? Number(staffId) : null,
          branchId: board.branchId, seatNow,
        }),
      });
      onDone(seatNow ? `${name} is seated with ${chosen?.name}.` : `${name} added to the queue as #${res.ticket_number}.`);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => { e.preventDefault(); void submit(canSeatNow); };

  return (
    <Dialog title="Add a walk-in" sub="Pick the service to see who can take them and how long they'd wait." onClose={onClose} wide
      footer={(
        <>
          <button type="button" className={`${s.btn} ${s.btnLg}`} onClick={() => submit(false)} disabled={busy}>
            <i className="fa-solid fa-people-line" /> Add to queue
          </button>
          <button type="button" className={`${s.btn} ${s.btnLg} ${s.btnPrimary}`} onClick={() => submit(true)} disabled={busy || !canSeatNow}
            title={canSeatNow ? '' : 'Choose a service and someone who is free now'}>
            <i className="fa-solid fa-chair" /> {chosen && canSeatNow ? `Seat now with ${chosen.name.split(' ')[0]}` : 'Seat now'}
          </button>
        </>
      )}>
      <form onSubmit={onSubmit} className={s.fields}>
        <label className={s.field}>
          <span className={s.label}>Customer name</span>
          <input className={s.input} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ali Raza" required />
        </label>
        <label className={s.field}>
          <span className={s.label}>Phone <span className={s.hint}>(optional)</span></span>
          <input className={s.input} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx xxxxxxx" />
        </label>
        <div className={s.field}>
          <span className={s.label}>Service</span>
          <Dropdown aria-label="Service" value={serviceId} onChange={setServiceId} icon="fa-scissors" placeholder="Choose a service"
            options={[{ value: '', label: 'Not sure yet' }, ...board.services.map((sv) => ({ value: String(sv.id), label: sv.name, sublabel: `${sv.minutes} min` }))]} />
        </div>
        <div className={s.field}>
          <span className={s.label}>Staff</span>
          <Dropdown aria-label="Staff" value={staffId} onChange={setStaffId} icon="fa-user"
            options={[{ value: '', label: 'Anyone (fastest)', icon: 'fa-bolt' }, ...board.lanes.map((l) => ({ value: String(l.staffId), label: l.name, sublabel: l.off ? l.offReason || 'Off' : undefined }))]} />
        </div>
        <label className={`${s.field} ${s.fieldFull}`}>
          <span className={s.label}>Note <span className={s.hint}>(optional)</span></span>
          <input className={s.input} value={note} maxLength={255} onChange={(e) => setNote(e.target.value)} placeholder="e.g. wants a skin fade" />
        </label>
        <button type="submit" hidden />
      </form>

      <div className={s.field}>
        <span className={s.label}>Who can take them{minutes ? ` · ${minutes} min` : ''}</span>
        {options === null ? <div className={s.muted}>Checking the schedule…</div> : options.length === 0 ? (
          <div className={s.muted}>Nobody on the team does this service.</div>
        ) : (
          <div className={s.options} role="radiogroup" aria-label="Staff options">
            {options.map((o, i) => (
              <button key={o.staffId} type="button" role="radio" aria-checked={pick === o.staffId} disabled={!o.available}
                className={`${s.option} ${pick === o.staffId ? s.optionOn : ''} ${!o.available ? s.optionOff : ''}`}
                onClick={() => setPick(o.staffId)}>
                <i className={`fa-solid ${o.available ? (o.waitMinutes! <= 5 ? 'fa-circle-check' : 'fa-clock') : 'fa-ban'}`}
                  style={{ color: o.available ? (o.waitMinutes! <= 5 ? '#0f9d58' : '#b76e00') : '#9aa5b8' }} />
                <span className={s.optionMain}>
                  <strong>{o.name}</strong>
                  <span>
                    {o.available ? (o.waitMinutes! <= 5 ? 'Free now' : `From ${hm(o.start)} · wait about ${dur(o.waitMinutes)}`) : o.reason}
                    {o.note ? ` · ${o.note}` : ''}
                  </span>
                </span>
                {i === 0 && o.available && <span className={s.best}>Soonest</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <div className={s.err} role="alert"><i className="fa-solid fa-circle-exclamation" /> {error}</div>}
    </Dialog>
  );
}

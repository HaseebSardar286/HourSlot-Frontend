'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useOrgLocale } from '@/lib/org-locale-context';
import s from '@/components/workspace/tools.module.css';

import Dropdown from '@/components/ui/Dropdown';
import DatePicker from '@/components/ui/DatePicker';
type Promo = {
  id: number;
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  minAmount: number;
  validUntil?: string | null;
  maxUses?: number | null;
  perCustomerLimit: number;
  active: boolean;
  timesUsed: number;
};

const EMPTY = { code: '', discountType: 'PERCENT', discountValue: '', minAmount: '', validUntil: '', maxUses: '' };

/** Create and manage promo codes customers enter when booking. */
export default function PromoCodesPanel() {
  const { format } = useOrgLocale();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      setPromos(await apiFetch<Promo[]>('/api/provider-tools/promos'));
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Could not load promo codes.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/provider-tools/promos', {
        method: 'POST',
        body: JSON.stringify({
          code: form.code,
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          minAmount: form.minAmount ? Number(form.minAmount) : 0,
          validUntil: form.validUntil ? `${form.validUntil}T23:59` : null,
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          perCustomerLimit: 1,
        }),
      });
      setForm(EMPTY);
      setOpen(false);
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not create the code.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (p: Promo) =>
    void apiFetch(`/api/provider-tools/promos/${p.id}/${p.active ? 'deactivate' : 'activate'}`, { method: 'PUT' })
      .then(load)
      .catch((e) => setError(e?.message || 'Could not update the code.'));

  const expired = (p: Promo) => Boolean(p.validUntil && new Date(p.validUntil).getTime() < now);

  return (
    <section className={s.panel}>
      <div className={s.panelHead}>
        <span className={`${s.iconTile} ${s.toneGreen}`}><i className="fa-solid fa-ticket" /></span>
        <div className={s.panelHeadText}>
          <h2>Promo codes</h2>
          <p>Share a code on WhatsApp or Instagram; customers enter it when they book. Each customer can use a code once.</p>
        </div>
        {!open && (
          <button type="button" className={`${s.btn} ${s.btnSoft} ${s.btnSm}`} onClick={() => setOpen(true)}>
            <i className="fa-solid fa-plus" /> New code
          </button>
        )}
      </div>

      <div className={s.panelBody}>
        {error && <div className={`${s.alert} ${s.alertErr}`}><i className="fa-solid fa-circle-exclamation" /> {error}</div>}

        {open && (
          <form onSubmit={create} className={s.preview} style={{ flexDirection: 'column', background: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
            <div className={`${s.fieldGrid} ${s.fieldGrid3}`}>
              <label className={s.field}>
                <span className={s.label}>Code</span>
                <input className={s.input} required value={form.code} placeholder="EID20" maxLength={32} autoFocus
                  style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.05em', fontWeight: 700 }}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/\s+/g, '') }))} />
              </label>
              <label className={s.field}>
                <span className={s.label}>Discount type</span>
                <Dropdown aria-label="Discount type" value={form.discountType}
                  onChange={(v) => setForm((f) => ({ ...f, discountType: v }))}
                  options={[
                    { value: 'PERCENT', label: 'Percent off', icon: 'fa-percent' },
                    { value: 'FIXED', label: 'Fixed amount off', icon: 'fa-money-bill' },
                  ]} />
              </label>
              <label className={s.field}>
                <span className={s.label}>{form.discountType === 'PERCENT' ? 'Percent off' : 'Amount off'}</span>
                <span className={s.affix}>
                  <input required type="number" min={1} max={form.discountType === 'PERCENT' ? 100 : undefined}
                    value={form.discountValue} onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))} />
                  <span>{form.discountType === 'PERCENT' ? '%' : 'amount'}</span>
                </span>
              </label>
              <label className={s.field}>
                <span className={s.label}>Minimum spend <span className={s.hint}>(optional)</span></span>
                <input className={s.input} type="number" min={0} value={form.minAmount} placeholder="No minimum"
                  onChange={(e) => setForm((f) => ({ ...f, minAmount: e.target.value }))} />
              </label>
              <label className={s.field}>
                <span className={s.label}>Last day <span className={s.hint}>(optional)</span></span>
                <DatePicker aria-label="Last day" value={form.validUntil} placeholder="No end date" clearable
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(v) => setForm((f) => ({ ...f, validUntil: v }))} />
              </label>
              <label className={s.field}>
                <span className={s.label}>Total uses <span className={s.hint}>(optional)</span></span>
                <input className={s.input} type="number" min={1} value={form.maxUses} placeholder="Unlimited"
                  onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))} />
              </label>
            </div>
            <div className={s.btnRow} style={{ justifyContent: 'flex-end' }}>
              <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => { setOpen(false); setForm(EMPTY); }}>
                Cancel
              </button>
              <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>
                {saving ? <span className="spinner" /> : <i className="fa-solid fa-plus" />} Create code
              </button>
            </div>
          </form>
        )}

        {promos.length === 0 && !open ? (
          <div className={s.empty}>
            <i className="fa-solid fa-ticket" />
            <strong>No promo codes yet</strong>
            Create one for a sale, a festival or your first customers.
          </div>
        ) : (
          <div className={s.promoGrid}>
            {promos.map((p) => {
              const off = !p.active || expired(p);
              const pct = p.maxUses ? Math.min(100, Math.round((p.timesUsed / p.maxUses) * 100)) : 0;
              return (
                <article key={p.id} className={`${s.ticket} ${off ? s.ticketOff : ''}`}>
                  <div className={s.ticketTop}>
                    <span className={s.code}>{p.code}</span>
                    <span className={`${s.chip} ${!p.active ? s.chipSlate : expired(p) ? s.chipAmber : s.chipGreen}`}>
                      {!p.active ? 'Paused' : expired(p) ? 'Expired' : 'Active'}
                    </span>
                  </div>
                  <div className={s.ticketDeal}>
                    {p.discountType === 'PERCENT' ? `${p.discountValue}% off` : `${format(p.discountValue)} off`}
                  </div>
                  <div className={s.ticketMeta}>
                    {Number(p.minAmount) > 0 ? `On ${format(p.minAmount)} or more` : 'Any booking'}
                    {p.validUntil ? ` · until ${new Date(p.validUntil).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
                    <br />
                    Used {p.timesUsed}
                    {p.maxUses ? ` of ${p.maxUses}` : ' times'}
                  </div>
                  {p.maxUses ? <div className={s.usage}><span style={{ width: `${pct}%` }} /></div> : null}
                  <div className={s.btnRow}>
                    <button type="button" className={`${s.btn} ${s.btnSm}`} style={{ flex: 1 }}
                      onClick={() => void navigator.clipboard?.writeText(p.code)}>
                      <i className="fa-regular fa-copy" /> Copy
                    </button>
                    <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnGhost}`} style={{ flex: 1 }} onClick={() => toggle(p)}>
                      <i className={`fa-solid ${p.active ? 'fa-pause' : 'fa-play'}`} /> {p.active ? 'Pause' : 'Resume'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

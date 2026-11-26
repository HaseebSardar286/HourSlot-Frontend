'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { money } from '@/lib/payments';
import Dropdown from '@/components/ui/Dropdown';
import s from '@/components/workspace/tools.module.css';

type SecretView = { saved: boolean; last4?: string | null; fromServerConfig: boolean };
type Gateway = {
  environment: string;
  secretKey: SecretView;
  webhookSecret: SecretView;
  plans: { code: string; name: string; price: number; currency: string; safepayPlanId?: string | null }[];
};

function errText(e: unknown, fallback: string) {
  return (e as { message?: string })?.message || fallback;
}

function secretStatus(v?: SecretView) {
  if (!v) return '';
  if (v.saved) return `Saved · ends in ${v.last4 || '••••'}`;
  if (v.fromServerConfig) return 'Using the server setting';
  return 'Not set';
}

/** Duemet's own Safepay account. Businesses pay their plan by card into it; secrets never come back to the browser. */
export default function GatewayPanel() {
  const [g, setG] = useState<Gateway | null>(null);
  const [form, setForm] = useState({ environment: 'sandbox', secretKey: '', webhookSecret: '' });
  const [plans, setPlans] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const apply = useCallback((d: Gateway) => {
    setG(d);
    setForm({ environment: d.environment || 'sandbox', secretKey: '', webhookSecret: '' });
    setPlans(Object.fromEntries(d.plans.map((p) => [p.code, p.safepayPlanId || ''])));
  }, []);

  useEffect(() => {
    apiFetch<Gateway>('/api/admin/billing/gateway').then(apply)
      .catch((e) => setMsg({ ok: false, text: errText(e, 'Could not load the payment account.') }));
  }, [apply]);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      apply(await apiFetch<Gateway>('/api/admin/billing/gateway', {
        method: 'PUT',
        body: JSON.stringify({ ...form, plans }),
      }));
      setMsg({ ok: true, text: 'Saved. Card payments use these details straight away.' });
    } catch (e) {
      setMsg({ ok: false, text: errText(e, 'Could not save.') });
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await apiFetch<{ ok: boolean; message: string }>('/api/admin/billing/gateway/test', { method: 'POST' });
      setMsg({ ok: r.ok, text: r.message });
    } catch (e) {
      setMsg({ ok: false, text: errText(e, 'Could not reach Safepay.') });
    } finally {
      setBusy(false);
    }
  }

  const webhookUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/api/public/safepay/webhook`;

  return (
    <section className={s.panel}>
      <div className={s.panelHead}>
        <div className={s.panelHeadText}>
          <h2>Payment account</h2>
          <p>Duemet&apos;s Safepay account. Businesses pay their plan by card into it, and the money settles to the bank account linked in Safepay.</p>
        </div>
      </div>
      <div className={s.panelBody}>
        {msg && (
          <div className={`${s.alert} ${msg.ok ? s.alertOk : s.alertErr}`} role={msg.ok ? 'status' : 'alert'}>
            <i className={`fa-solid ${msg.ok ? 'fa-circle-check' : 'fa-circle-exclamation'}`} /> {msg.text}
          </div>
        )}
        {!g ? (
          <div className={s.skel} style={{ height: 160 }} />
        ) : (
          <div className={s.stack}>
            <div className={s.fieldGrid}>
              <label className={s.field}>
                <span className={s.label}>Mode</span>
                <Dropdown id="gw-env" aria-label="Mode" value={form.environment}
                  onChange={(v) => setForm({ ...form, environment: v })}
                  options={[{ value: 'sandbox', label: 'Sandbox (testing)' }, { value: 'production', label: 'Live' }]} />
              </label>
              <label className={s.field}>
                <span className={s.label}>Secret key</span>
                <input id="gw-secret" className={s.input} type="password" autoComplete="off" value={form.secretKey}
                  placeholder={g.secretKey.saved ? 'Leave empty to keep the saved key' : 'Safepay > Developers > API keys'}
                  onChange={(e) => setForm({ ...form, secretKey: e.target.value })} />
                <span className={s.hint}>{secretStatus(g.secretKey)}</span>
              </label>
              <label className={s.field}>
                <span className={s.label}>Webhook secret</span>
                <input id="gw-webhook" className={s.input} type="password" autoComplete="off" value={form.webhookSecret}
                  placeholder={g.webhookSecret.saved ? 'Leave empty to keep the saved secret' : 'Safepay > Developers > Endpoints'}
                  onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })} />
                <span className={s.hint}>{secretStatus(g.webhookSecret)}</span>
              </label>
            </div>
            <p className={s.hint}>
              In Safepay, add a webhook endpoint pointing to <strong className={s.code}>{webhookUrl}</strong> (from the live
              site in production) so payments are confirmed automatically.
            </p>

            <h3 style={{ margin: 0, fontSize: 15 }}>Safepay plan for each Duemet plan</h3>
            <p className={s.hint}>Create a monthly plan at the same price in Safepay &gt; Subscriptions &gt; Plans and paste its ID. Plans without an ID can only be paid by bank or wallet.</p>
            <div className={s.fieldGrid}>
              {g.plans.map((p) => (
                <label key={p.code} className={s.field}>
                  <span className={s.label}>{p.name} · {money(p.price, p.currency)}/month</span>
                  <input className={s.input} value={plans[p.code] || ''} placeholder="plan_…"
                    onChange={(e) => setPlans({ ...plans, [p.code]: e.target.value })} />
                </label>
              ))}
            </div>

            <div className={s.btnRow}>
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={busy} onClick={save}>Save</button>
              <button type="button" className={`${s.btn} ${s.btnGhost}`} disabled={busy} onClick={test}>Test connection</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

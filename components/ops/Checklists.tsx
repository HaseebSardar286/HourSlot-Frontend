'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Dropdown from '@/components/ui/Dropdown';
import DatePicker from '@/components/ui/DatePicker';
import { addDays, dayLabel, errMsg, hm, todayIso, type Me } from '@/lib/ops';
import Dialog from './Dialog';
import OpsHero, { Kpi, Notice } from './OpsHero';
import s from './ops.module.css';

type Item = { id: number; label: string; done_at?: string | null; done_by?: string | null };
type List = { id: number; name: string; kind: string; branch_name?: string; assignee_staff_id?: number | null; assignee_name?: string | null; items: Item[]; done: number; total: number };
type Day = { date: string; checklists: List[]; done: number; total: number };
type Template = { id: number; name: string; kind: string; branch_id?: number | null; assignee_staff_id?: number | null; active: boolean; items: { id: number; label: string }[] };

const KINDS = [
  { value: 'OPENING', label: 'Opening', icon: 'fa-door-open' },
  { value: 'CLOSING', label: 'Closing', icon: 'fa-door-closed' },
  { value: 'CLEANING', label: 'Cleaning', icon: 'fa-broom' },
  { value: 'OTHER', label: 'Other', icon: 'fa-list-check' },
];
const KIND_TONE: Record<string, string> = { OPENING: s.tBlue, CLOSING: s.tViolet, CLEANING: s.tGreen, OTHER: s.tSlate };

/** Daily opening / closing / cleaning checklists. Anyone ticks; the owner edits the lists. */
export default function Checklists() {
  const [me, setMe] = useState<Me | null>(null);
  const [date, setDate] = useState(todayIso());
  const [day, setDay] = useState<Day | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setDay(await apiFetch<Day>(`/api/staff-ops/checklists/today?date=${date}`)); } catch (e) { setError(errMsg(e)); }
  }, [date]);
  const loadTemplates = useCallback(async () => {
    try { setTemplates(await apiFetch<Template[]>('/api/staff-ops/checklists')); } catch { setTemplates([]); }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  useEffect(() => {
    apiFetch<Me>('/api/front-desk/me').then((m) => { setMe(m); if (m.owner) void loadTemplates(); }).catch(() => null);
  }, [loadTemplates]);

  const tick = async (item: Item, done: boolean) => {
    setDay((d) => d && { ...d, checklists: d.checklists.map((c) => ({ ...c, items: c.items.map((i) => (i.id === item.id ? { ...i, done_at: done ? 'now' : null } : i)) })) });
    try {
      await apiFetch(`/api/staff-ops/checklists/items/${item.id}?done=${done}&date=${date}`, { method: 'PUT' });
      void load();
    } catch (e) { setError(errMsg(e)); void load(); }
  };

  const owner = !!me?.owner;
  const pct = day && day.total ? Math.round((day.done / day.total) * 100) : 0;

  return (
    <div className={s.page}>
      <OpsHero eyebrow="Team · Checklists" title="Daily checklists"
        text="Opening, closing and cleaning routines. Tick tasks as they're done; the list starts fresh every day."
        actions={owner ? <button type="button" className={s.whiteBtn} onClick={() => setEditing('new')}><i className="fa-solid fa-plus" /> New checklist</button> : null}>
        <div className={s.dayNav}>
          <button type="button" className={s.glassBtn} aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}><i className="fa-solid fa-chevron-left" /></button>
          <div style={{ width: 230 }}><DatePicker value={date} max={todayIso()} onChange={(d) => setDate(d || todayIso())} aria-label="Day" /></div>
          <button type="button" className={s.glassBtn} aria-label="Next day" disabled={date >= todayIso()} onClick={() => setDate(addDays(date, 1))}><i className="fa-solid fa-chevron-right" /></button>
        </div>
      </OpsHero>

      <Notice error={error} ok={ok} />

      <div className={s.kpis}>
        <Kpi label={`Done ${date === todayIso() ? 'today' : dayLabel(date)}`} value={`${pct}%`} sub={`${day?.done || 0} of ${day?.total || 0} tasks`} icon="fa-list-check" tone={pct === 100 ? s.tGreen : s.tBlue} />
        <Kpi label="Checklists" value={day?.checklists.length || 0} sub={`${day?.checklists.filter((c) => c.total && c.done === c.total).length || 0} complete`} icon="fa-clipboard-check" tone={s.tViolet} />
      </div>

      {day && day.checklists.length === 0 && (
        <section className={s.panel}><div className={s.empty} style={{ padding: 40 }}><i className="fa-solid fa-clipboard-list" />
          {owner ? 'No checklists yet. Create an opening or closing routine for the team.' : 'No checklists for you yet.'}</div></section>
      )}

      <div className={s.grid3}>
        {day?.checklists.map((c) => (
          <section key={c.id} className={s.panel}>
            <div className={s.panelHead}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className={`${s.kpiIcon} ${KIND_TONE[c.kind]}`}><i className={`fa-solid ${KINDS.find((k) => k.value === c.kind)?.icon}`} /></span>
                <div><h2>{c.name}</h2><p>{c.assignee_name ? `For ${c.assignee_name}` : 'Anyone'}{c.branch_name ? ` · ${c.branch_name}` : ''}</p></div>
              </div>
              <span className={`${s.tag} ${c.done === c.total && c.total ? s.tagGreen : ''}`}>{c.done}/{c.total}</span>
            </div>
            <div className={s.panelBody} style={{ display: 'grid', gap: 2 }}>
              <div className={`${s.progress} ${c.done === c.total ? s.progressGood : ''}`} style={{ marginBottom: 8 }}><span style={{ width: `${c.total ? (c.done / c.total) * 100 : 0}%` }} /></div>
              {c.items.map((i) => (
                <label key={i.id} className={`${s.checkItem} ${i.done_at ? s.checkDone : ''}`}>
                  <input type="checkbox" checked={!!i.done_at} onChange={(e) => tick(i, e.target.checked)} />
                  <span>{i.label}</span>
                  {i.done_at && i.done_at !== 'now' && <span className={s.checkBy}>{i.done_by?.split(' ')[0]} · {hm(i.done_at)}</span>}
                </label>
              ))}
            </div>
            {owner && (
              <div className={s.panelBody} style={{ paddingTop: 0 }}>
                <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => { const t = templates.find((x) => x.id === c.id); if (t) setEditing(t); }}>
                  <i className="fa-solid fa-pen" /> Edit list
                </button>
              </div>
            )}
          </section>
        ))}
      </div>

      {owner && templates.some((t) => !t.active) && (
        <section className={s.panel}>
          <div className={s.panelHead}><div><h2>Paused checklists</h2><p>Not shown to the team until switched back on.</p></div></div>
          <div className={s.panelBody} style={{ display: 'grid', gap: 8 }}>
            {templates.filter((t) => !t.active).map((t) => (
              <div key={t.id} className={s.settingRow}>
                <div><strong>{t.name}</strong><span>{t.items.length} tasks</span></div>
                <button type="button" className={s.btn} onClick={async () => { await apiFetch(`/api/staff-ops/checklists/${t.id}`, { method: 'PUT', body: JSON.stringify({ active: true }) }); void loadTemplates(); void load(); }}>Switch on</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {editing && me && (
        <EditDialog me={me} t={editing === 'new' ? null : editing} onClose={() => setEditing(null)}
          onSaved={(m) => { setEditing(null); setOk(m); void load(); void loadTemplates(); }} />
      )}
    </div>
  );
}

function EditDialog({ me, t, onClose, onSaved }: { me: Me; t: Template | null; onClose: () => void; onSaved: (m: string) => void }) {
  const [name, setName] = useState(t?.name || '');
  const [kind, setKind] = useState(t?.kind || 'OPENING');
  const [assignee, setAssignee] = useState(t?.assignee_staff_id ? String(t.assignee_staff_id) : '');
  const [branch, setBranch] = useState(t?.branch_id ? String(t.branch_id) : '');
  const [items, setItems] = useState<string[]>(t ? t.items.map((i) => i.label) : ['']);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    const body = JSON.stringify({ name, kind, assigneeStaffId: assignee ? Number(assignee) : null, branchId: branch ? Number(branch) : null, items: items.filter((i) => i.trim()) });
    try {
      if (t) await apiFetch(`/api/staff-ops/checklists/${t.id}`, { method: 'PUT', body });
      else await apiFetch('/api/staff-ops/checklists', { method: 'POST', body });
      onSaved(t ? 'Checklist updated.' : 'Checklist created.');
    } catch (e) { setError(errMsg(e)); }
  };
  const pause = async () => {
    if (!t) return;
    await apiFetch(`/api/staff-ops/checklists/${t.id}`, { method: 'PUT', body: JSON.stringify({ active: false }) }).catch(() => null);
    onSaved('Checklist paused.');
  };
  const remove = async () => {
    if (!t) return;
    await apiFetch(`/api/staff-ops/checklists/${t.id}`, { method: 'DELETE' }).catch(() => null);
    onSaved('Checklist deleted.');
  };

  return (
    <Dialog title={t ? 'Edit checklist' : 'New checklist'} sub="One task per line. Ticks from earlier days are kept for tasks you don't rename." onClose={onClose} wide
      footer={(
        <>
          {t && <button type="button" className={`${s.btn} ${s.btnLg} ${s.btnDanger}`} onClick={remove}>Delete</button>}
          {t && <button type="button" className={`${s.btn} ${s.btnLg}`} onClick={pause}>Pause</button>}
          <button type="button" className={`${s.btn} ${s.btnLg} ${s.btnPrimary}`} onClick={save}>Save</button>
        </>
      )}>
      <div className={s.fields}>
        <label className={s.field}><span className={s.label}>Name</span><input className={s.input} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="e.g. Opening routine" /></label>
        <div className={s.field}><span className={s.label}>Type</span><Dropdown aria-label="Type" value={kind} onChange={setKind} options={KINDS} /></div>
        <div className={s.field}><span className={s.label}>For</span>
          <Dropdown aria-label="Assigned to" value={assignee} onChange={setAssignee} icon="fa-user" options={[{ value: '', label: 'Anyone on shift' }, ...me.staff.map((m) => ({ value: String(m.id), label: m.name }))]} /></div>
        {me.branches.length > 1 && (
          <div className={s.field}><span className={s.label}>Branch</span>
            <Dropdown aria-label="Branch" value={branch} onChange={setBranch} icon="fa-location-dot" options={[{ value: '', label: 'All branches' }, ...me.branches.map((b) => ({ value: String(b.id), label: b.name }))]} /></div>
        )}
      </div>
      <div className={s.field}>
        <span className={s.label}>Tasks</span>
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', gap: 8 }}>
              <input className={s.input} value={it} maxLength={160} placeholder={`Task ${i + 1}`} aria-label={`Task ${i + 1}`}
                onChange={(e) => setItems((x) => x.map((v, j) => (j === i ? e.target.value : v)))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setItems((x) => [...x.slice(0, i + 1), '', ...x.slice(i + 1)]); } }} />
              <button type="button" className={`${s.btn} ${s.btnGhost} ${s.iconOnly}`} aria-label="Remove task" style={{ height: 42 }}
                onClick={() => setItems((x) => (x.length > 1 ? x.filter((_, j) => j !== i) : ['']))}><i className="fa-solid fa-xmark" /></button>
            </div>
          ))}
          <button type="button" className={s.btn} style={{ justifySelf: 'start' }} onClick={() => setItems((x) => [...x, ''])}><i className="fa-solid fa-plus" /> Add task</button>
        </div>
      </div>
      {error && <div className={s.err}>{error}</div>}
    </Dialog>
  );
}

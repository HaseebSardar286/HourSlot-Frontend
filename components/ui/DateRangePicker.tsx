'use client';

import { useEffect, useRef, useState } from 'react';
import c from './controls.module.css';
import FloatingMenu from './FloatingMenu';

export type RangePreset = { key: string; label: string; from: string; to: string };

type Props = {
  from: string; // yyyy-mm-dd
  to: string;
  /** Which preset is active, or 'custom'. */
  preset?: string;
  presets?: RangePreset[];
  onChange: (range: { from: string; to: string; preset: string }) => void;
  max?: string;
  tone?: 'light' | 'dark';
  align?: 'left' | 'right';
  id?: string;
};

const WD = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => new Date(`${s}T00:00:00`);
const nice = (s: string) => parse(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Range picker: preset list on the left, two months on the right; pick a start then an end, then Apply. */
export default function DateRangePicker({ from, to, preset = 'custom', presets = [], onChange, max, tone = 'light', align = 'left', id }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ from: string; to: string | null }>({ from, to });
  const [view, setView] = useState(() => { const d = parse(to); return new Date(d.getFullYear(), d.getMonth() - 1, 1); });
  const [hover, setHover] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement | null>(null);
  const today = iso(new Date());
  const limit = max || today;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrap.current?.contains(t) || menu.current?.contains(t)) return;
      setOpen(false);
    };
    const onEsc = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, [open]);

  const toggle = () => {
    if (!open) {
      setDraft({ from, to });
      const d = parse(to);
      setView(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    }
    setOpen(!open);
  };

  const clickDay = (d: string) => {
    if (draft.to !== null) {
      // A complete range exists: start a new one.
      setDraft({ from: d, to: null });
    } else if (d < draft.from) {
      setDraft({ from: d, to: draft.from });
    } else {
      setDraft({ from: draft.from, to: d });
    }
  };

  const apply = () => {
    if (!draft.to) return;
    onChange({ from: draft.from, to: draft.to, preset: 'custom' });
    setOpen(false);
  };

  const choosePreset = (p: RangePreset) => {
    onChange({ from: p.from, to: p.to, preset: p.key });
    setOpen(false);
  };

  const end = draft.to ?? (hover && hover >= draft.from ? hover : null);
  const label = preset !== 'custom' ? presets.find((p) => p.key === preset)?.label : null;

  const month = (base: Date, idx: number) => {
    const y = base.getFullYear();
    const m = base.getMonth();
    const first = (new Date(y, m, 1).getDay() + 6) % 7; // Monday first
    const days = new Date(y, m + 1, 0).getDate();
    const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => iso(new Date(y, m, i + 1)))];
    return (
      <div className={`${c.month} ${idx === 0 ? c.monthHidden : ''}`} key={`${y}-${m}`}>
        <div className={c.monthHead}>
          {idx === 0 ? (
            <button type="button" className={c.nav} aria-label="Previous month" onClick={() => setView(new Date(y, m - 1, 1))}>
              <i className="fa-solid fa-chevron-left" aria-hidden />
            </button>
          ) : <span className={`${c.nav} ${c.navGhost}`} />}
          <span>{base.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
          {idx === 1 ? (
            <button type="button" className={c.nav} aria-label="Next month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}>
              <i className="fa-solid fa-chevron-right" aria-hidden />
            </button>
          ) : <span className={`${c.nav} ${c.navGhost}`} />}
        </div>
        <div className={c.grid} role="grid">
          {WD.map((w) => <span key={w} className={c.wd}>{w}</span>)}
          {cells.map((d, i) => {
            if (!d) return <span key={`e${i}`} />;
            const isStart = d === draft.from;
            const isEnd = d === end;
            const inRange = end && d > draft.from && d < end;
            return (
              <button key={d} type="button" disabled={d > limit} onClick={() => clickDay(d)} onMouseEnter={() => setHover(d)}
                aria-pressed={isStart || isEnd} aria-label={nice(d)}
                className={`${c.day} ${d === today ? c.today : ''} ${inRange ? c.inRange : ''} ${isStart && end ? c.rangeStart : ''} ${isEnd ? c.rangeEnd : ''} ${isStart && !end ? `${c.rangeStart} ${c.rangeEnd}` : ''}`}>
                <span>{Number(d.slice(8))}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div ref={wrap} className={`${c.wrap} ${tone === 'dark' ? c.dark : ''} ${open ? c.open : ''}`}>
      <button id={id} type="button" className={c.trigger} onClick={toggle} aria-haspopup="dialog" aria-expanded={open}>
        <span className={c.lead}><i className="fa-regular fa-calendar" aria-hidden /></span>
        <span className={c.value}>{label || `${nice(from)} – ${nice(to)}`}</span>
        <i className={`fa-solid fa-chevron-down ${c.chev}`} aria-hidden />
      </button>
      {open && (
        <FloatingMenu anchor={wrap} menuRef={menu} align={align} className={`${c.menu} ${c.rangeMenu}`} role="dialog" aria-label="Choose dates">
          {presets.length > 0 && (
            <div className={c.presets}>
              {presets.map((p) => (
                <button key={p.key} type="button" className={p.key === preset ? c.presetOn : ''} onClick={() => choosePreset(p)}>{p.label}</button>
              ))}
            </div>
          )}
          <div className={c.cal} onMouseLeave={() => setHover(null)}>
            <div className={c.months}>
              {month(view, 0)}
              {month(new Date(view.getFullYear(), view.getMonth() + 1, 1), 1)}
            </div>
            <div className={c.calFoot}>
              <span>
                {draft.to ? <><strong>{nice(draft.from)}</strong> to <strong>{nice(draft.to)}</strong></> : <>Pick an end date after <strong>{nice(draft.from)}</strong></>}
              </span>
              <span className={c.actions}>
                <button type="button" className={c.btn} onClick={() => setOpen(false)}>Cancel</button>
                <button type="button" className={`${c.btn} ${c.btnPrimary}`} disabled={!draft.to} onClick={apply}>Apply</button>
              </span>
            </div>
          </div>
        </FloatingMenu>
      )}
    </div>
  );
}

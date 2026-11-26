'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import c from './controls.module.css';
import FloatingMenu from './FloatingMenu';

const WD = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => new Date(`${s}T00:00:00`);

/** Close a popover on outside click or Escape. The menu itself is drawn on <body>, so it counts as inside. */
function usePopover(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || menu.current?.contains(t)) return;
      close();
    };
    const onEsc = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, [open, close]);
  return { ref, menu };
}

type DateProps = {
  value: string; // yyyy-mm-dd or ''
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  clearable?: boolean;
  tone?: 'light' | 'dark';
  align?: 'left' | 'right';
  'aria-label'?: string;
};

/** Single date: a calendar with month/year navigation, today shortcut and optional clear. */
export default function DatePicker({
  value, onChange, min, max, placeholder = 'Pick a date', id, disabled, clearable, tone = 'light', align = 'left', ...rest
}: DateProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => { const d = value ? parse(value) : new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [focus, setFocus] = useState<string>(value || iso(new Date()));
  const [pickMonth, setPickMonth] = useState(false);
  const { ref, menu } = usePopover(open, () => setOpen(false));
  const today = iso(new Date());

  const toggle = () => {
    if (disabled) return;
    if (!open) {
      const d = value ? parse(value) : new Date();
      setView(new Date(d.getFullYear(), d.getMonth(), 1));
      setFocus(value || today);
      setPickMonth(false);
    }
    setOpen(!open);
  };

  const allowed = (d: string) => (!min || d >= min) && (!max || d <= max);
  const pick = (d: string) => { if (!allowed(d)) return; onChange(d); setOpen(false); };

  const move = (days: number) => {
    const d = parse(focus);
    d.setDate(d.getDate() + days);
    const s = iso(d);
    setFocus(s);
    setView(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  const onKey = (e: KeyboardEvent) => {
    if (!open) return;
    const k: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (k[e.key]) { e.preventDefault(); move(k[e.key]); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(focus); }
  };

  const y = view.getFullYear();
  const m = view.getMonth();
  const first = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => iso(new Date(y, m, i + 1)))];
  const label = value ? parse(value).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : null;
  const years = Array.from({ length: 12 }, (_, i) => new Date().getFullYear() - 3 + i);

  return (
    <div ref={ref} className={`${c.wrap} ${tone === 'dark' ? c.dark : ''} ${open ? c.open : ''}`} onKeyDown={onKey}>
      <button id={id} type="button" className={c.trigger} onClick={toggle} disabled={disabled}
        aria-haspopup="dialog" aria-expanded={open} aria-label={rest['aria-label']}>
        <span className={c.lead}><i className="fa-regular fa-calendar" aria-hidden /></span>
        <span className={`${c.value} ${label ? '' : c.placeholder}`}>{label || placeholder}</span>
        <i className={`fa-solid fa-chevron-down ${c.chev}`} aria-hidden />
      </button>
      {open && (
        <FloatingMenu anchor={ref} menuRef={menu} align={align} className={c.menu} style={{ minWidth: 0 }} role="dialog" aria-label="Choose a date">
          <div className={c.cal} style={{ padding: 10 }}>
            <div className={c.month} style={{ width: 252 }}>
              <div className={c.monthHead}>
                <button type="button" className={c.nav} aria-label="Previous month" onClick={() => setView(new Date(y, m - 1, 1))}>
                  <i className="fa-solid fa-chevron-left" aria-hidden />
                </button>
                <button type="button" className={c.headBtn} aria-label="Choose month and year" onClick={() => setPickMonth(!pickMonth)}>
                  {view.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                  <i className={`fa-solid fa-caret-${pickMonth ? 'up' : 'down'}`} aria-hidden />
                </button>
                <button type="button" className={c.nav} aria-label="Next month" onClick={() => setView(new Date(y, m + 1, 1))}>
                  <i className="fa-solid fa-chevron-right" aria-hidden />
                </button>
              </div>
              {pickMonth ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div className={c.yearRow}>
                    {years.map((n) => (
                      <button key={n} type="button" className={`${c.monthCell} ${n === y ? c.monthOn : ''}`} onClick={() => setView(new Date(n, m, 1))}>{n}</button>
                    ))}
                  </div>
                  <div className={c.monthGrid}>
                    {MONTHS.map((n, i) => (
                      <button key={n} type="button" className={`${c.monthCell} ${i === m ? c.monthOn : ''}`}
                        onClick={() => { setView(new Date(y, i, 1)); setPickMonth(false); }}>{n}</button>
                    ))}
                  </div>
                </div>
              ) : (
              <div className={c.grid} role="grid" style={{ gridTemplateColumns: 'repeat(7, 36px)' }}>
                {WD.map((w) => <span key={w} className={c.wd}>{w}</span>)}
                {cells.map((d, i) => d ? (
                  <button key={d} type="button" disabled={!allowed(d)} onClick={() => pick(d)} tabIndex={d === focus ? 0 : -1}
                    aria-pressed={d === value} aria-label={parse(d).toLocaleDateString('en-GB', { dateStyle: 'full' })}
                    className={`${c.day} ${d === today ? c.today : ''} ${d === value ? `${c.rangeStart} ${c.rangeEnd}` : ''} ${d === focus && d !== value ? c.focusDay : ''}`}>
                    <span>{Number(d.slice(8))}</span>
                  </button>
                ) : <span key={`e${i}`} />)}
              </div>
              )}
            </div>
            <div className={c.calFoot}>
              <button type="button" className={c.btn} disabled={!allowed(today)} onClick={() => pick(today)}>Today</button>
              {clearable && value && <button type="button" className={c.btn} onClick={() => { onChange(''); setOpen(false); }}>Clear</button>}
            </div>
          </div>
        </FloatingMenu>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- time

type TimeProps = {
  value: string; // HH:mm or ''
  onChange: (value: string) => void;
  step?: number; // minutes
  min?: string;
  max?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  tone?: 'light' | 'dark';
  'aria-label'?: string;
};

export function to12h(t: string) {
  if (!t) return '';
  const [h, mm] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${pad(mm || 0)} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Time of day: a scrolling list in fixed steps, scrolled to the current choice. */
export function TimePicker({ value, onChange, step = 15, min, max, placeholder = 'Pick a time', id, disabled, tone = 'light', ...rest }: TimeProps) {
  const [open, setOpen] = useState(false);
  const { ref, menu } = usePopover(open, () => setOpen(false));
  const list = useRef<HTMLUListElement>(null);
  const times: string[] = [];
  for (let t = 0; t < 24 * 60; t += step) {
    const s = `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
    if ((!min || s >= min) && (!max || s <= max)) times.push(s);
  }
  if (value && !times.includes(value)) { times.push(value); times.sort(); }

  useEffect(() => {
    if (!open || !list.current) return;
    const el = list.current.querySelector('[aria-selected="true"]') as HTMLElement | null
      || list.current.querySelector('[data-t="09:00"]') as HTMLElement | null;
    if (el) list.current.scrollTop = el.offsetTop - 90;
  }, [open]);

  const onKey = (e: KeyboardEvent) => {
    if (!open) return;
    const i = times.indexOf(value);
    if (e.key === 'ArrowDown') { e.preventDefault(); onChange(times[Math.min(times.length - 1, i + 1)] || times[0]); }
    if (e.key === 'ArrowUp') { e.preventDefault(); onChange(times[Math.max(0, i - 1)] || times[0]); }
    if (e.key === 'Enter') { e.preventDefault(); setOpen(false); }
  };

  return (
    <div ref={ref} className={`${c.wrap} ${tone === 'dark' ? c.dark : ''} ${open ? c.open : ''}`} onKeyDown={onKey}>
      <button id={id} type="button" className={c.trigger} disabled={disabled} onClick={() => setOpen(!open)}
        aria-haspopup="listbox" aria-expanded={open} aria-label={rest['aria-label']}>
        <span className={c.lead}><i className="fa-regular fa-clock" aria-hidden /></span>
        <span className={`${c.value} ${value ? '' : c.placeholder}`}>{value ? to12h(value) : placeholder}</span>
        <i className={`fa-solid fa-chevron-down ${c.chev}`} aria-hidden />
      </button>
      {open && (
        <FloatingMenu anchor={ref} menuRef={menu} className={c.menu} style={{ minWidth: 150 }}>
          <ul ref={list} role="listbox" className={c.list} style={{ maxHeight: 240, position: 'relative' }}>
            {times.map((t) => (
              <li key={t} data-t={t} role="option" aria-selected={t === value}
                className={`${c.option} ${t === value ? `${c.selected} ${c.active}` : ''}`}
                onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(t); setOpen(false); }}>
                <span className={c.optText}>{to12h(t)}</span>
                {t === value && <i className={`fa-solid fa-check ${c.tick}`} aria-hidden />}
              </li>
            ))}
          </ul>
        </FloatingMenu>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- month

/** Month and year: a 12-month grid with year arrows. Value is yyyy-mm. */
export function MonthPicker({ value, onChange, id, disabled, tone = 'light', align = 'left', ...rest }: {
  value: string; onChange: (v: string) => void; id?: string; disabled?: boolean; tone?: 'light' | 'dark'; align?: 'left' | 'right'; 'aria-label'?: string;
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number((value || iso(new Date())).slice(0, 4)));
  const { ref, menu } = usePopover(open, () => setOpen(false));
  const label = value ? new Date(`${value}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'Pick a month';
  const now = iso(new Date()).slice(0, 7);

  return (
    <div ref={ref} className={`${c.wrap} ${tone === 'dark' ? c.dark : ''} ${open ? c.open : ''}`}>
      <button id={id} type="button" className={c.trigger} disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-label={rest['aria-label']}
        onClick={() => { if (!open) setYear(Number((value || now).slice(0, 4))); setOpen(!open); }}>
        <span className={c.lead}><i className="fa-regular fa-calendar" aria-hidden /></span>
        <span className={c.value}>{label}</span>
        <i className={`fa-solid fa-chevron-down ${c.chev}`} aria-hidden />
      </button>
      {open && (
        <FloatingMenu anchor={ref} menuRef={menu} align={align} className={c.menu} role="dialog" aria-label="Choose a month">
          <div style={{ padding: 8, width: 252, display: 'grid', gap: 10 }}>
            <div className={c.monthHead}>
              <button type="button" className={c.nav} aria-label="Previous year" onClick={() => setYear(year - 1)}><i className="fa-solid fa-chevron-left" aria-hidden /></button>
              <span>{year}</span>
              <button type="button" className={c.nav} aria-label="Next year" onClick={() => setYear(year + 1)}><i className="fa-solid fa-chevron-right" aria-hidden /></button>
            </div>
            <div className={c.monthGrid}>
              {MONTHS.map((n, i) => {
                const v = `${year}-${pad(i + 1)}`;
                return (
                  <button key={n} type="button" aria-pressed={v === value}
                    className={`${c.monthCell} ${v === value ? c.monthOn : ''} ${v === now ? c.monthNow : ''}`}
                    onClick={() => { onChange(v); setOpen(false); }}>{n}</button>
                );
              })}
            </div>
          </div>
        </FloatingMenu>
      )}
    </div>
  );
}

/** Date and time together, emitting yyyy-mm-ddTHH:mm (the datetime-local format). */
export function DateTimePicker({ value, onChange, id, min, disabled }: { value: string; onChange: (v: string) => void; id?: string; min?: string; disabled?: boolean }) {
  const [d, t] = value ? value.split('T') : ['', ''];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 8 }}>
      <DatePicker id={id} value={d} min={min} disabled={disabled} aria-label="Date"
        onChange={(nd) => onChange(nd ? `${nd}T${(t || '09:00').slice(0, 5)}` : '')} />
      <TimePicker value={(t || '').slice(0, 5)} disabled={disabled || !d} aria-label="Time"
        onChange={(nt) => onChange(`${d || iso(new Date())}T${nt}`)} />
    </div>
  );
}

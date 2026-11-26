'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import c from './controls.module.css';
import FloatingMenu from './FloatingMenu';

export type DropdownOption = { value: string; label: string; sublabel?: string; icon?: string };

type Props = {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** Font Awesome icon shown at the start of the trigger. */
  icon?: string;
  /** Show a search box (defaults to on for more than 8 options). */
  searchable?: boolean;
  tone?: 'light' | 'dark';
  align?: 'left' | 'right';
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  className?: string;
};

/** Accessible custom select: click or keyboard (arrows, Home/End, Enter, Escape, type to jump). */
export default function Dropdown({
  value, options, onChange, placeholder = 'Choose…', icon, searchable, tone = 'light', align = 'left',
  disabled, id, className = '', ...rest
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement | null>(null);
  const listId = useId();
  const showSearch = searchable ?? options.length > 8;

  const shown = query.trim()
    ? options.filter((o) => `${o.label} ${o.sublabel || ''}`.toLowerCase().includes(query.trim().toLowerCase()))
    : options;
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrap.current?.contains(t) || menu.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const openMenu = () => {
    if (disabled) return;
    setQuery('');
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    btn.current?.focus();
  };

  const onKey = (e: KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openMenu(); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); btn.current?.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(shown.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(shown.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[active]) pick(shown[active].value); }
    else if (e.key === 'Tab') setOpen(false);
    else if (!showSearch && e.key.length === 1) {
      const i = shown.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (i >= 0) setActive(i);
    }
  };

  return (
    <div ref={wrap} className={`${c.wrap} ${tone === 'dark' ? c.dark : ''} ${open ? c.open : ''} ${className}`} onKeyDown={onKey}>
      <button ref={btn} id={id} type="button" className={c.trigger} disabled={disabled} onClick={() => (open ? setOpen(false) : openMenu())}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-label={rest['aria-label']}>
        {(selected?.icon || icon) && <span className={c.lead}><i className={`fa-solid ${selected?.icon || icon}`} aria-hidden /></span>}
        <span className={`${c.value} ${selected ? '' : c.placeholder}`}>{selected?.label || placeholder}</span>
        <i className={`fa-solid fa-chevron-down ${c.chev}`} aria-hidden />
      </button>
      {open && (
        <FloatingMenu anchor={wrap} menuRef={menu} align={align} className={c.menu}>
          {showSearch && (
            <label className={c.search}>
              <i className="fa-solid fa-magnifying-glass" aria-hidden />
              <input autoFocus value={query} placeholder="Search" aria-label="Search options"
                onChange={(e) => { setQuery(e.target.value); setActive(0); }} />
            </label>
          )}
          <ul id={listId} role="listbox" className={c.list} aria-activedescendant={shown[active] ? `${listId}-${active}` : undefined} tabIndex={-1}>
            {shown.length === 0 && <li className={c.none}>Nothing matches</li>}
            {shown.map((o, i) => {
              const sel = o.value === value;
              return (
                <li key={o.value} id={`${listId}-${i}`} role="option" aria-selected={sel}
                  className={`${c.option} ${i === active ? c.active : ''} ${sel ? c.selected : ''}`}
                  onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(o.value)}>
                  {o.icon && <span className={c.optIcon}><i className={`fa-solid ${o.icon}`} aria-hidden /></span>}
                  <span className={c.optText}>
                    {o.label}
                    {o.sublabel && <span className={c.optSub}>{o.sublabel}</span>}
                  </span>
                  {sel && <i className={`fa-solid fa-check ${c.tick}`} aria-hidden />}
                </li>
              );
            })}
          </ul>
        </FloatingMenu>
      )}
    </div>
  );
}

/** A styled on/off switch in place of a plain checkbox. */
export function Switch({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }) {
  return (
    <label className={c.switch}>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={c.knob} aria-hidden />
      {label}
    </label>
  );
}

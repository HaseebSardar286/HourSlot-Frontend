'use client';

import { ReactNode, useEffect, useRef } from 'react';
import s from './ops.module.css';

/** Modal dialog: closes on Escape or a click on the backdrop, and keeps focus inside while open. */
export default function Dialog({
  title, sub, onClose, children, footer, wide,
}: { title: string; sub?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  // Parents pass inline handlers; keep the latest in a ref so focus isn't reset on every render.
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = box.current?.querySelector<HTMLElement>('input, button:not([data-close]), [tabindex="0"]');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
      if (e.key === 'Tab' && box.current) {
        const items = Array.from(box.current.querySelectorAll<HTMLElement>('button, input, textarea, [tabindex="0"]'))
          .filter((el) => !el.hasAttribute('disabled'));
        if (!items.length) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, []);

  return (
    <div className={s.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={box} className={`${s.dialog} ${wide ? s.dialogWide : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className={s.dialogHead}>
          <div>
            <h2>{title}</h2>
            {sub && <p>{sub}</p>}
          </div>
          <button type="button" data-close className={`${s.btn} ${s.btnGhost} ${s.iconOnly}`} onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className={s.dialogBody}>{children}</div>
        {footer && <div className={s.dialogFoot}>{footer}</div>}
      </div>
    </div>
  );
}

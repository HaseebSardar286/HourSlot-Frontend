'use client';

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

const GAP = 8;
const EDGE = 8;

/**
 * A dropdown panel drawn on <body>, positioned under (or above) its trigger. Cards, modals and scrolling
 * panels that clip their content can't hide it. Follows the trigger on scroll and resize.
 */
export default function FloatingMenu({
  anchor, menuRef, align = 'left', className, style, children, role, fullWidthOnPhone = true, ...rest
}: {
  /** Span the screen width on phones (the shared controls do; the older pickers keep their own width). */
  fullWidthOnPhone?: boolean;
  /** The element the menu opens from (usually the control's wrapper). */
  anchor: RefObject<HTMLElement | null>;
  /** Receives the menu element, so outside-click checks can include it. */
  menuRef?: RefObject<HTMLDivElement | null>;
  align?: 'left' | 'right';
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  role?: string;
  'aria-label'?: string;
}) {
  const local = useRef<HTMLDivElement | null>(null);
  const matchWidth = style?.minWidth === undefined;

  useLayoutEffect(() => {
    const place = () => {
      const a = anchor.current;
      const m = local.current;
      if (!a || !m) return;
      const r = a.getBoundingClientRect();
      const phone = fullWidthOnPhone && window.innerWidth <= 720;
      if (phone) {
        // Full screen width on phones, with the usual 16px side gutter.
        m.style.width = `${window.innerWidth - 32}px`;
        m.style.minWidth = '0px';
      } else if (matchWidth) {
        m.style.minWidth = `${r.width}px`;
      }
      // Measure at the menu's own size (its CSS max-height still applies), then fit it to the screen.
      m.style.maxHeight = '';
      const mw = m.offsetWidth;
      const natural = m.offsetHeight;
      const below = window.innerHeight - r.bottom - GAP - EDGE;
      const above = r.top - GAP - EDGE;
      const up = natural > below && above > below;
      const room = Math.max(160, up ? above : below);
      if (natural > room) m.style.maxHeight = `${room}px`;
      const mh = Math.min(natural, room);
      let left = phone ? 16 : align === 'right' ? r.right - mw : r.left;
      left = Math.max(EDGE, Math.min(left, window.innerWidth - mw - EDGE));
      const top = up ? Math.max(EDGE, r.top - GAP - mh) : r.bottom + GAP;
      m.style.left = `${left}px`;
      m.style.top = `${top}px`;
      m.style.visibility = 'visible';
    };
    place();
    // Page and container scrolls move the trigger; scrolling the menu's own list doesn't.
    const onScroll = (e: Event) => {
      if (e.target instanceof Node && local.current?.contains(e.target)) return;
      place();
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', place);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null;
    if (ro && local.current) ro.observe(local.current);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', place);
      ro?.disconnect();
    };
  }, [anchor, align, matchWidth, fullWidthOnPhone]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={(el) => {
        local.current = el;
        if (menuRef) menuRef.current = el;
      }}
      className={className}
      role={role}
      aria-label={rest['aria-label']}
      style={{
        ...style,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 'auto',
        zIndex: 3000,
        overflowY: 'auto',
        visibility: 'hidden',
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

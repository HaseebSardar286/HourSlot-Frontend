'use client';

import { useEffect } from 'react';

/**
 * Turns every success/error message box in the app into a toast: it slides in at the top right, stays
 * 5 seconds (paused while hovered), then slides out. Clicking closes it. If the same box later shows a
 * new message, it appears again with a fresh 5 seconds.
 *
 * Pages keep rendering their messages exactly as before; this watches the page for them.
 */
const DURATION = 5000;

/** Message boxes, by global class or by CSS-module class name (e.g. "tools-module__x__alertErr"). */
function isFlash(el: Element) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest('[data-flash-skip]')) return false;
  if (el.classList.contains('success-alert') || el.classList.contains('error-alert')) return true;
  for (const c of Array.from(el.classList)) {
    // Dev/Turbopack: "tools-module__hash__alertErr"; webpack production: "tools_alertErr__hash".
    if (/^(tools|ops|public)-module__[\w-]+__(alert|alertErr|alertOk|err|ok)$/.test(c)) return true;
    if (/^(tools|ops|public)_(alert|alertErr|alertOk|err|ok)__[\w-]+$/.test(c)) return true;
  }
  return false;
}

type State = { text: string; timer?: number; left?: number; started?: number };
const states = new WeakMap<HTMLElement, State>();
const live = new Set<HTMLElement>();

function layout() {
  // Stack visible toasts under the header, newest at the top.
  let top = 72;
  const items = Array.from(live).filter((el) => el.isConnected && el.style.display !== 'none').reverse();
  for (const el of items) {
    el.style.top = `${top}px`;
    top += el.offsetHeight + 8;
  }
}

function hide(el: HTMLElement) {
  const st = states.get(el);
  if (st?.timer) window.clearTimeout(st.timer);
  el.classList.add('flash-out');
  const done = () => {
    el.removeEventListener('animationend', done);
    if (!el.classList.contains('flash-out')) return;
    el.style.display = 'none';
    el.classList.remove('flash-out');
    live.delete(el);
    layout();
  };
  el.addEventListener('animationend', done);
}

function schedule(el: HTMLElement, ms: number) {
  const st = states.get(el);
  if (!st) return;
  if (st.timer) window.clearTimeout(st.timer);
  st.left = ms;
  st.started = Date.now();
  st.timer = window.setTimeout(() => hide(el), ms);
}

function show(el: HTMLElement) {
  const text = el.textContent || '';
  const st = states.get(el) || { text: '' };
  st.text = text;
  states.set(el, st);
  el.style.display = '';
  el.classList.remove('flash-out');
  // Restart the entrance animation.
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
  live.add(el);
  if (!el.dataset.flashBound) {
    el.dataset.flashBound = '1';
    el.addEventListener('mouseenter', () => {
      const s = states.get(el);
      if (s?.timer) {
        window.clearTimeout(s.timer);
        s.left = Math.max(800, (s.left ?? DURATION) - (Date.now() - (s.started ?? Date.now())));
        s.timer = undefined;
      }
    });
    el.addEventListener('mouseleave', () => schedule(el, states.get(el)?.left ?? DURATION));
    el.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('a, button')) return;
      hide(el);
    });
    el.setAttribute('title', 'Click to close');
  }
  schedule(el, DURATION);
  layout();
}

function check(el: HTMLElement) {
  const text = el.textContent || '';
  if (!text.trim()) return;
  const st = states.get(el);
  if (!st || st.text !== text || el.style.display === 'none') show(el);
}

export default function FlashHost() {
  useEffect(() => {
    const scan = (root: ParentNode) => {
      if (root instanceof Element && isFlash(root)) check(root as HTMLElement);
      root.querySelectorAll?.('*').forEach((el) => { if (isFlash(el)) check(el as HTMLElement); });
    };
    scan(document.body);
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'childList') {
          r.addedNodes.forEach((n) => { if (n instanceof Element) scan(n); });
        }
        // Text changed inside an existing message box: show it again.
        let node: Node | null = r.target;
        while (node && !(node instanceof HTMLElement && isFlash(node))) node = node.parentNode;
        if (node) check(node as HTMLElement);
        r.removedNodes.forEach((n) => { if (n instanceof HTMLElement && live.has(n)) { live.delete(n); layout(); } });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => mo.disconnect();
  }, []);
  return null;
}

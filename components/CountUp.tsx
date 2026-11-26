'use client';

import { useEffect, useState } from 'react';

const NUMBER = /-?\d[\d,]*(\.\d+)?/;

/**
 * Animates the number inside a display string ("PKR 11,100", "14.3%", "4.8 / 5") from 0 to its value.
 * Text without a number is shown as is. Respects reduced-motion.
 */
export default function CountUp({ value, duration = 700 }: { value: string | number; duration?: number }) {
  const text = String(value ?? '');
  const num = text.match(NUMBER)?.[0] ?? null;
  const [shown, setShown] = useState(() => (num ? text.replace(num, '0') : text));

  useEffect(() => {
    if (!num) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const target = Number(num.replace(/,/g, ''));
    if (reduce || !Number.isFinite(target) || target === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- show the final value straight away
      setShown(text);
      return;
    }
    const decimals = num.includes('.') ? num.split('.')[1].length : 0;
    const grouped = num.includes(',') || Math.abs(target) >= 1000;
    const fmt = (n: number) => (grouped
      ? n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : n.toFixed(decimals));
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(p >= 1 ? text : text.replace(num, fmt(target * eased)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, num, duration]);

  return <>{num ? shown : text}</>;
}

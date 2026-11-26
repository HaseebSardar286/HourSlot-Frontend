'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import s from './docs.module.css';

/** Frame for a printable document: a back link and a print button that disappear on paper. */
export default function DocShell({ back, children }: { back: { href: string; label: string }; children: ReactNode }) {
  return (
    <main className={s.shell}>
      <div className={s.bar}>
        <Link
          href={back.href}
          onClick={(e) => {
            // Opened from inside the app: go back to the exact page (business or solo workspace).
            if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) {
              e.preventDefault();
              window.history.back();
            }
          }}
        >
          <i className="fa-solid fa-arrow-left" /> {back.label}
        </Link>
        <button type="button" className={s.printBtn} onClick={() => window.print()}>
          <i className="fa-solid fa-print" /> Print or save as PDF
        </button>
      </div>
      {children}
    </main>
  );
}

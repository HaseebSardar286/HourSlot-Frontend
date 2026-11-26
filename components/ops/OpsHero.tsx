'use client';

import CountUp from '@/components/CountUp';
import { ReactNode } from 'react';
import s from './ops.module.css';

export default function OpsHero({ eyebrow, title, text, actions, children }: {
  eyebrow: string; title: string; text: string; actions?: ReactNode; children?: ReactNode;
}) {
  return (
    <section className={s.hero}>
      <div className={s.heroTop}>
        <div>
          <div className={s.eyebrow}>{eyebrow}</div>
          <h1>{title}</h1>
          <p>{text}</p>
        </div>
        {actions && <div className={s.heroActions}>{actions}</div>}
      </div>
      {children && <div className={s.heroBar}>{children}</div>}
    </section>
  );
}

export function Kpi({ label, value, sub, icon, tone }: { label: string; value: ReactNode; sub?: ReactNode; icon: string; tone?: string }) {
  return (
    <div className={s.kpi}>
      <span className={`${s.kpiIcon} ${tone || ''}`}><i className={`fa-solid ${icon}`} /></span>
      <div style={{ minWidth: 0 }}>
        <div className={s.kpiLabel}>{label}</div>
        <div className={s.kpiValue}>{typeof value === 'string' || typeof value === 'number' ? <CountUp value={value} /> : value}</div>
        {sub != null && <div className={s.kpiSub}>{sub}</div>}
      </div>
    </div>
  );
}

export function Notice({ error, ok }: { error?: string | null; ok?: string | null }) {
  return (
    <>
      {error && <div className={s.err} role="alert"><i className="fa-solid fa-circle-exclamation" /> {error}</div>}
      {ok && <div className={s.ok} role="status"><i className="fa-solid fa-circle-check" /> {ok}</div>}
    </>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { filtersToApi, type InsightFilters } from '@/lib/insights';
import c from '@/components/ui/controls.module.css';
import FloatingMenu from '@/components/ui/FloatingMenu';
import r from './reports.module.css';

export type ReportKind = 'performance' | 'team' | 'customers';

const LABEL: Record<ReportKind, string> = {
  performance: 'Performance',
  team: 'Team',
  customers: 'Customers & services',
};

/** Downloads the report as an Excel workbook with the filters currently applied. */
export default function DownloadReport({ report, filters }: { report: ReportKind; filters: InsightFilters }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrap.current?.contains(t) || menu.current?.contains(t)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, [open]);

  async function download(kind: ReportKind | 'all') {
    setOpen(false);
    setBusy(kind);
    setError(null);
    try {
      const qs = filtersToApi(filters).slice(1);
      const res = await fetch(`/api/business/insights/export?report=${kind}&${qs}`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(res.status === 401 ? 'Your session expired. Sign in again.' : 'Could not create the Excel file.');
      const blob = await res.blob();
      const header = res.headers.get('Content-Disposition') || '';
      const name = /filename="([^"]+)"/.exec(header)?.[1] || `duemet-${kind}-report.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div ref={wrap} className={`${c.wrap} ${open ? c.open : ''}`}>
      <button type="button" className={r.download} onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} disabled={!!busy}>
        <i className={`fa-solid ${busy ? 'fa-spinner fa-spin' : 'fa-file-excel'}`} aria-hidden />
        {busy ? 'Preparing…' : 'Download Excel'}
        <i className={`fa-solid fa-chevron-down ${c.chev}`} style={{ color: 'inherit' }} aria-hidden />
      </button>
      {open && (
        <FloatingMenu anchor={wrap} menuRef={menu} align="right" className={c.menu} role="menu" style={{ minWidth: 260 }}>
          <ul className={c.list}>
            <li role="menuitem" tabIndex={0} className={c.option} onClick={() => download(report)}
              onKeyDown={(e) => e.key === 'Enter' && download(report)}>
              <span className={c.optIcon} style={{ background: '#e3f5ea', color: '#107c41' }}><i className="fa-solid fa-file-excel" aria-hidden /></span>
              <span className={c.optText}>This report<span className={c.optSub}>{LABEL[report]} with your filters</span></span>
            </li>
            <li role="menuitem" tabIndex={0} className={c.option} onClick={() => download('all')}
              onKeyDown={(e) => e.key === 'Enter' && download('all')}>
              <span className={c.optIcon} style={{ background: '#e3f5ea', color: '#107c41' }}><i className="fa-solid fa-layer-group" aria-hidden /></span>
              <span className={c.optText}>All reports<span className={c.optSub}>Performance, Team, Customers &amp; services</span></span>
            </li>
          </ul>
        </FloatingMenu>
      )}
      {error && <div className={r.downloadError} role="alert">{error}</div>}
    </div>
  );
}

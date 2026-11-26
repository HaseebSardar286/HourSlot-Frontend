'use client';

import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  RANGE_PRESETS, filtersFromParams, filtersToQuery, presetDates,
  type FilterOptions, type InsightFilters,
} from '@/lib/insights';
import Dropdown from '@/components/ui/Dropdown';
import DateRangePicker from '@/components/ui/DateRangePicker';
import DownloadReport, { type ReportKind } from './DownloadReport';
import r from './reports.module.css';

type Props = {
  /** Which report this page shows (used for the Excel download). */
  report: ReportKind;
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: (f: InsightFilters, options: FilterOptions | null) => ReactNode;
};

function fmt(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Inner({ report, eyebrow = 'Reports', title, subtitle, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = useMemo(() => filtersFromParams(new URLSearchParams(params.toString())), [params]);
  const [options, setOptions] = useState<FilterOptions | null>(null);

  useEffect(() => {
    apiFetch<FilterOptions>('/api/business/insights/options').then(setOptions).catch(() => setOptions(null));
  }, []);

  const set = (patch: Partial<InsightFilters>) => {
    const next = { ...filters, ...patch };
    if (patch.range && patch.range !== 'custom') Object.assign(next, presetDates(patch.range));
    // A staff member belongs to one branch; drop a staff filter that no longer fits.
    if (patch.branchId !== undefined && next.staffId && options) {
      const st = options.staff.find((o) => String(o.id) === next.staffId);
      if (st && next.branchId && String(st.branchId) !== next.branchId) next.staffId = undefined;
    }
    router.replace(`${pathname}${filtersToQuery(next)}`, { scroll: false });
  };

  const staffChoices = (options?.staff || []).filter((o) => !filters.branchId || String(o.branchId) === filters.branchId);
  const filtered = !!(filters.branchId || filters.staffId || filters.serviceId) || filters.range !== '30d';

  return (
    <div className={r.page}>
      <section className={r.hero}>
        <div className={r.heroTop}>
          <div>
            <div className={r.eyebrow}>{eyebrow}</div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className={r.heroActions}>
            <span className={r.periodPill}>
              <i className="fa-regular fa-calendar" aria-hidden /> {fmt(filters.from)} – {fmt(filters.to)}
            </span>
            <DownloadReport report={report} filters={filters} />
          </div>
        </div>

        <div className={r.filters} role="group" aria-label="Filters">
          <div className={r.filter}>
            <span id="rep-period-label">Period</span>
            <DateRangePicker id="rep-period" from={filters.from} to={filters.to} preset={filters.range}
              presets={RANGE_PRESETS.filter((p) => p.key !== 'custom').map((p) => ({ key: p.key, label: p.label, ...presetDates(p.key) }))}
              onChange={({ from, to, preset }) => set(preset === 'custom' ? { range: 'custom', from, to } : { range: preset })} />
          </div>
          {(options?.branches.length || 0) > 1 && (
            <div className={r.filter}>
              <span>Branch</span>
              <Dropdown id="rep-branch" icon="fa-store" aria-label="Branch" value={filters.branchId || ''}
                onChange={(v) => set({ branchId: v || undefined })}
                options={[{ value: '', label: 'All branches' }, ...options!.branches.map((b) => ({ value: String(b.id), label: b.name }))]} />
            </div>
          )}
          <div className={r.filter}>
            <span>Staff</span>
            <Dropdown id="rep-staff" icon="fa-user-tie" aria-label="Staff member" value={filters.staffId || ''}
              onChange={(v) => set({ staffId: v || undefined })}
              options={[{ value: '', label: 'Everyone' }, ...staffChoices.map((o) => ({ value: String(o.id), label: o.name }))]} />
          </div>
          <div className={r.filter}>
            <span>Service</span>
            <Dropdown id="rep-service" icon="fa-scissors" aria-label="Service" value={filters.serviceId || ''}
              onChange={(v) => set({ serviceId: v || undefined })}
              options={[{ value: '', label: 'All services' }, ...(options?.services || []).map((o) => ({ value: String(o.id), label: o.name }))]} />
          </div>
          {filtered && (
            <button type="button" className={r.reset} onClick={() => router.replace(pathname, { scroll: false })}>
              <i className="fa-solid fa-rotate-left" aria-hidden /> Reset
            </button>
          )}
        </div>
      </section>

      {children(filters, options)}
    </div>
  );
}

export default function ReportsShell(props: Props) {
  return <Suspense fallback={null}><Inner {...props} /></Suspense>;
}

/** Fetch a report whenever the filters change; keeps the last result on screen while reloading. */
export function useReport<T>(path: string, apiQuery: string) {
  const [state, setState] = useState<{ key: string; data: T | null; error: string | null }>({ key: '', data: null, error: null });
  const key = `${path}${apiQuery}`;
  useEffect(() => {
    let alive = true;
    apiFetch<T>(key)
      .then((data) => { if (alive) setState({ key, data, error: null }); })
      .catch((e) => { if (alive) setState({ key, data: null, error: e?.message || 'Could not load the report.' }); });
    return () => { alive = false; };
  }, [key]);
  return { data: state.data, error: state.error, loading: state.key !== key };
}

export function Loading() {
  return (
    <>
      <div className={r.kpis}>{[0, 1, 2, 3].map((i) => <div key={i} className={r.skel} style={{ height: 132 }} />)}</div>
      <div className={r.skel} style={{ height: 320 }} />
    </>
  );
}

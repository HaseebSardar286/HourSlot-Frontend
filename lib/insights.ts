/** Business insights: shared types and the filter state that travels in the URL between the three pages. */

export type InsightFilters = {
  range: string; // preset key or 'custom'
  from: string; // yyyy-mm-dd
  to: string;
  branchId?: string;
  staffId?: string;
  serviceId?: string;
};

export type Kpis = {
  bookings: number;
  completed: number;
  cancelled: number;
  noShows: number;
  upcoming: number;
  earned: number;
  bookedValue: number;
  collected: number;
  averageValue: number;
  customers: number;
  newCustomers: number;
  returningCustomers: number;
  bookedHours: number;
  leadDays: number;
  noShowRate: number;
  cancellationRate: number;
  rating: number;
  reviews: number;
};

export type Period = { from: string; to: string; days: number; previousFrom: string; previousTo: string };

export type Overview = {
  period: Period;
  kpis: Kpis;
  previous: Kpis;
  bucket: 'day' | 'week' | 'month';
  trend: { period: string; bookings: number; completed: number; earned: number }[];
  status: { status: string; count: number }[];
  heatmap: { weekday: number; hour: number; bookings: number }[];
  branches: { id: number; name: string; bookings: number; earned: number; noShows: number }[];
  paymentMethods: { method: string; payments: number; amount: number }[];
  walkIns: { total: number; served: number; avgWait: number };
};

export type StaffRow = {
  id: number;
  name: string;
  designation?: string;
  active: boolean;
  branch: string;
  bookings: number;
  completed: number;
  noShows: number;
  cancelled: number;
  upcoming: number;
  earned: number;
  customers: number;
  rating: number | null;
  topService?: string | null;
  bookedHours: number;
  noShowRate: number;
  share: number;
  averageValue: number;
};

export type Team = { period: Period; staff: StaffRow[]; totalEarned: number };

export type CustomersReport = {
  period: Period;
  kpis: Kpis;
  repeatRate: number;
  averageVisits: number;
  services: { id: number; name: string; listPrice: number; bookings: number; completed: number; cancelled: number; earned: number; customers: number }[];
  topCustomers: { id: number; name: string; email: string; visits: number; noShows: number; spend: number; lastVisit?: string | null }[];
  atRisk: { id: number; name: string; email: string; phone?: string | null; visits: number; spend: number; lastVisit: string }[];
  ratings: { stars: number; count: number }[];
  latestReviews: { id: number; rating: number; comment?: string | null; createdAt: string; replied: boolean; customer: string }[];
};

export type FilterOptions = {
  branches: { id: number; name: string }[];
  staff: { id: number; name: string; branchId: number }[];
  services: { id: number; name: string }[];
  currency: string;
};

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const RANGE_PRESETS: { key: string; label: string }[] = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: '90d', label: 'Last 90 days' },
  { key: '12m', label: 'Last 12 months' },
  { key: 'custom', label: 'Custom dates' },
];

export function presetDates(key: string, today = new Date()): { from: string; to: string } {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const back = (n: number) => { const d = new Date(t); d.setDate(d.getDate() - n); return d; };
  switch (key) {
    case '7d': return { from: iso(back(6)), to: iso(t) };
    case '90d': return { from: iso(back(89)), to: iso(t) };
    case '12m': { const d = new Date(t); d.setFullYear(d.getFullYear() - 1); d.setDate(d.getDate() + 1); return { from: iso(d), to: iso(t) }; }
    case 'month': return { from: iso(new Date(t.getFullYear(), t.getMonth(), 1)), to: iso(t) };
    case 'lastMonth': return { from: iso(new Date(t.getFullYear(), t.getMonth() - 1, 1)), to: iso(new Date(t.getFullYear(), t.getMonth(), 0)) };
    default: return { from: iso(back(29)), to: iso(t) };
  }
}

export function filtersFromParams(sp: URLSearchParams): InsightFilters {
  const range = sp.get('range') || '30d';
  const dates = range === 'custom' ? { from: sp.get('from') || presetDates('30d').from, to: sp.get('to') || presetDates('30d').to } : presetDates(range);
  return {
    range,
    ...dates,
    branchId: sp.get('branchId') || undefined,
    staffId: sp.get('staffId') || undefined,
    serviceId: sp.get('serviceId') || undefined,
  };
}

/** Query string for the page URL (keeps the preset, so "last 30 days" stays relative). */
export function filtersToQuery(f: InsightFilters): string {
  const q = new URLSearchParams();
  if (f.range !== '30d') q.set('range', f.range);
  if (f.range === 'custom') { q.set('from', f.from); q.set('to', f.to); }
  if (f.branchId) q.set('branchId', f.branchId);
  if (f.staffId) q.set('staffId', f.staffId);
  if (f.serviceId) q.set('serviceId', f.serviceId);
  const s = q.toString();
  return s ? `?${s}` : '';
}

/** Query string for the API (always concrete dates). */
export function filtersToApi(f: InsightFilters): string {
  const q = new URLSearchParams({ from: f.from, to: f.to });
  if (f.branchId) q.set('branchId', f.branchId);
  if (f.staffId) q.set('staffId', f.staffId);
  if (f.serviceId) q.set('serviceId', f.serviceId);
  return `?${q.toString()}`;
}

export function compact(n: number, currency?: string) {
  const v = Number(n || 0);
  const s = Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
    : Math.abs(v) >= 10_000 ? `${(v / 1_000).toFixed(v >= 100_000 ? 0 : 1)}k`
    : v.toLocaleString('en-PK', { maximumFractionDigits: 0 });
  return currency ? `${currency} ${s}` : s;
}

export function full(n: number, currency?: string) {
  const s = Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
  return currency ? `${currency} ${s}` : s;
}

/** Change vs the previous period: null when there is nothing to compare with. */
export function delta(now: number, before: number): number | null {
  const a = Number(now || 0);
  const b = Number(before || 0);
  if (b === 0) return null;
  return Math.round(((a - b) / b) * 100);
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'Completed',
  CONFIRMED: 'Confirmed',
  PENDING: 'Waiting for approval',
  IN_PROGRESS: 'In progress',
  RESCHEDULED: 'Rescheduled',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No-show',
  REJECTED: 'Declined',
};

export function shortDate(value: string, bucket: 'day' | 'week' | 'month' = 'day') {
  const d = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (bucket === 'month') return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

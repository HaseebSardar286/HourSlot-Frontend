/** Shared helpers for the front desk and team operations pages. */

export type Stage = 'EXPECTED' | 'ARRIVED' | 'IN_SERVICE' | 'DONE' | 'NO_SHOW' | 'CANCELLED';

export type Visit = {
  id: number;
  code: string;
  status: string;
  stage: Stage;
  start: string;
  end: string;
  source: string;
  walkIn: boolean;
  ticket?: number | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  price?: number | null;
  currency?: string | null;
  checkedInAt?: string | null;
  startedAt?: string | null;
  attendance?: 'CONFIRMED' | 'DECLINED' | null;
  notes?: string | null;
  customerId?: number | null;
  customerName: string;
  phone?: string | null;
  serviceId?: number | null;
  serviceName?: string | null;
  staffId?: number | null;
  staffName?: string | null;
  tip?: number | null;
  visits: number;
  noShows: number;
  firstVisit: boolean;
  alerts?: string | null;
  late?: boolean;
  lateMinutes?: number;
  startsInMinutes?: number;
  runningMinutes?: number;
};

export type QueueEntry = {
  id: number;
  ticket_number: number;
  customer_name: string;
  phone?: string | null;
  service_id?: number | null;
  service_name?: string | null;
  preferred_staff_id?: number | null;
  preferred_staff_name?: string | null;
  source: 'DESK' | 'SELF';
  note?: string | null;
  position: number;
  minutes: number;
  waitedMinutes: number;
  suggestedStaffId?: number;
  suggestedStaffName?: string;
  estimatedStart?: string;
  estimatedWaitMinutes?: number;
};

export type Span = { start: string; end: string };

export type Lane = {
  staffId: number;
  name: string;
  designation?: string | null;
  off: boolean;
  offReason?: string | null;
  windows: Span[];
  breaks: Span[];
  clockedIn: boolean;
  utilisation: number;
  state?: 'FREE' | 'BUSY' | 'BREAK' | 'OFF' | 'OUT_OF_HOURS';
  busyUntil?: string;
  freeMinutes?: number;
  queued?: number;
};

export type DeskSettings = {
  lateGraceMinutes: number;
  autoNoShow: boolean;
  reminder24h: boolean;
  reminder2h: boolean;
  askConfirmation: boolean;
  selfJoinQueue: boolean;
  lateClockInMinutes: number;
};

export type Board = {
  date: string;
  now: string;
  isToday: boolean;
  branchId: number | null;
  branches: { id: number; name: string }[];
  settings: DeskSettings;
  stats: Record<string, number>;
  visits: Visit[];
  queue: QueueEntry[];
  lanes: Lane[];
  services: { id: number; name: string; minutes: number; base_price?: number; currency?: string }[];
};

export type Me = {
  businessId: number;
  owner: boolean;
  staffId: number | null;
  clock: { clockedIn: boolean; since: string | null } | null;
  staff: { id: number; name: string; branch_id: number }[];
  branches: { id: number; name: string }[];
};

/** "2026-11-22T14:30" -> "2:30 PM" (the time is already branch-local). */
export function hm(iso?: string | null) {
  if (!iso) return '';
  const t = iso.length > 10 ? iso.slice(11, 16) : iso.slice(0, 5);
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export function minutesOf(iso: string) {
  const t = iso.length > 10 ? iso.slice(11, 16) : iso.slice(0, 5);
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function dur(min?: number | null) {
  if (min == null) return '';
  if (min < 1) return 'now';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h${min % 60 ? ` ${min % 60} min` : ''}`;
}

export function dayLabel(date: string, today?: string) {
  if (today && date === today) return 'Today';
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Presets for pay and attendance periods. */
export function periodPresets() {
  const t = todayIso();
  const d = new Date(`${t}T00:00:00`);
  const monday = addDays(t, -((d.getDay() + 6) % 7));
  const first = `${t.slice(0, 7)}-01`;
  const lastMonthEnd = addDays(first, -1);
  const lastMonthStart = `${lastMonthEnd.slice(0, 7)}-01`;
  return [
    { key: 'week', label: 'This week', from: monday, to: t },
    { key: 'lastweek', label: 'Last week', from: addDays(monday, -7), to: addDays(monday, -1) },
    { key: '14d', label: 'Last 14 days', from: addDays(t, -13), to: t },
    { key: 'month', label: 'This month', from: first, to: t },
    { key: 'lastmonth', label: 'Last month', from: lastMonthStart, to: lastMonthEnd },
  ];
}

export function initials(name?: string | null) {
  const parts = (name || '?').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

const AVATAR = ['#2a78d6', '#eb6834', '#1baf7a', '#c48a00', '#d1608c', '#6d4ae0', '#0e8a9a'];
export function avatarColor(id: number) {
  return AVATAR[Math.abs(id) % AVATAR.length];
}

export function errMsg(e: unknown, fallback = 'Something went wrong.') {
  return (e as { message?: string })?.message || fallback;
}

export function money(v?: number | string | null, currency = 'PKR') {
  const n = Number(v || 0);
  return `${currency} ${n.toLocaleString('en-US', { maximumFractionDigits: n % 1 ? 2 : 0 })}`;
}

/** Download an authenticated file (Excel export). */
export async function downloadFile(path: string, fallbackName: string) {
  const res = await fetch(path, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(res.status === 401 ? 'Your session expired. Sign in again.' : 'Could not create the file.');
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

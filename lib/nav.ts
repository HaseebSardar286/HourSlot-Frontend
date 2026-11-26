/**
 * Every sidebar menu in the app, by audience. Layouts only render these lists.
 *
 * Hiding a menu item is not security: the API enforces who may call what
 * (business APIs reject solo providers, provider APIs reject businesses).
 * When adding a page, add it here under the audience that owns it.
 */

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  /** Short label for the mobile bottom bar. */
  short?: string;
  /** Active only on an exact path match. */
  exact?: boolean;
  /** Plan entitlement code; the item shows a lock when the plan lacks it. */
  entitlement?: string;
  /** Opens in a new tab. */
  external?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  icon: string;
  children: NavItem[];
};

// ── Platform admin ────────────────────────────────────────────────

export const ADMIN_NAV: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'fa-chart-pie',
    children: [
      { href: '/admin/dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
      { href: '/admin/audit-logs', icon: 'fa-shield-halved', label: 'Audit Trail' },
    ],
  },
  {
    id: 'accounts',
    label: 'Accounts',
    icon: 'fa-users',
    children: [
      { href: '/admin/users', icon: 'fa-users', label: 'User Accounts' },
      { href: '/admin/businesses', icon: 'fa-store', label: 'Businesses' },
    ],
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: 'fa-tags',
    children: [
      { href: '/admin/categories', icon: 'fa-tags', label: 'Categories' },
      { href: '/admin/geo-areas', icon: 'fa-map-location-dot', label: 'Geo areas' },
      { href: '/admin/community', icon: 'fa-flag', label: 'Community' },
    ],
  },
  {
    id: 'money',
    label: 'Billing & support',
    icon: 'fa-file-invoice',
    children: [
      { href: '/admin/billing', icon: 'fa-file-invoice', label: 'Billing' },
      { href: '/admin/support', icon: 'fa-life-ring', label: 'Support' },
      { href: '/admin/disputes', icon: 'fa-scale-balanced', label: 'Disputes' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    icon: 'fa-sliders',
    children: [{ href: '/admin/settings', icon: 'fa-sliders', label: 'Settings' }],
  },
];

// ── Guests (public marketplace header) ────────────────────────────
export const GUEST_NAV: NavItem[] = [
  { href: '/profile/explore', label: 'Explore', icon: 'fa-compass' },
  { href: '/#pricing', label: 'Pricing', icon: 'fa-tags' },
  { href: '/#how-it-works', label: 'How it works', icon: 'fa-circle-question' },
  { href: '/community', label: 'Community', icon: 'fa-people-group', external: true },
];

// ── Customers (and owners/providers in "Customer mode") ───────────
export const CUSTOMER_NAV: NavItem[] = [
  { href: '/profile/explore', icon: 'fa-compass', label: 'Explore', short: 'Explore' },
  { href: '/profile/bookings', icon: 'fa-calendar-check', label: 'Bookings', short: 'Bookings' },
  { href: '/profile/requests', icon: 'fa-file-lines', label: 'Requests', short: 'Requests' },
  { href: '/profile/jobs', icon: 'fa-briefcase', label: 'Jobs', short: 'Jobs' },
  { href: '/profile/packages', icon: 'fa-gift', label: 'Packages', short: 'Packages' },
  { href: '/profile/addresses', icon: 'fa-location-dot', label: 'Addresses', short: 'Addresses' },
  { href: '/profile/support', icon: 'fa-life-ring', label: 'Help & support', short: 'Help' },
  { href: '/profile', icon: 'fa-user', label: 'Account', short: 'Account', exact: true },
];

/** The customer sidebar: Explore on its own, the rest in groups (same items as CUSTOMER_NAV). */
export const CUSTOMER_SIDEBAR: (NavItem | NavGroup)[] = [
  CUSTOMER_NAV[0],
  {
    id: 'bookings',
    label: 'My bookings',
    icon: 'fa-calendar-check',
    children: [CUSTOMER_NAV[1], CUSTOMER_NAV[4]],
  },
  {
    id: 'work',
    label: 'Requests & jobs',
    icon: 'fa-file-lines',
    children: [CUSTOMER_NAV[2], CUSTOMER_NAV[3]],
  },
  {
    id: 'account',
    label: 'My account',
    icon: 'fa-user',
    children: [CUSTOMER_NAV[7], CUSTOMER_NAV[5], CUSTOMER_NAV[6]],
  },
];

/** Bottom bar on phones; the rest sit behind "More". */
export const CUSTOMER_MOBILE_NAV: NavItem[] = ['/profile/explore', '/profile/bookings', '/profile/requests', '/profile'].map(
  (href) => CUSTOMER_NAV.find((i) => i.href === href)!
);

// ── Business owners (multi-staff businesses) ──────────────────────
export const BUSINESS_OWNER_NAV: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'fa-chart-pie',
    children: [
      { href: '/business/dashboard', icon: 'fa-house', label: 'Home' },
      { href: '/business/plan', icon: 'fa-crown', label: 'Subscription' },
      { href: '/business/organization', icon: 'fa-building', label: 'Organization' },
      { href: '/business/verification', icon: 'fa-file-shield', label: 'Verification' },
      { href: '/business/support', icon: 'fa-life-ring', label: 'Help & support' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: 'fa-chart-pie',
    children: [
      { href: '/business/reports', icon: 'fa-chart-line', label: 'Performance', exact: true },
      { href: '/business/reports/team', icon: 'fa-user-tie', label: 'Team' },
      { href: '/business/reports/customers', icon: 'fa-users', label: 'Customers & services' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: 'fa-calendar-check',
    children: [
      { href: '/business/front-desk', icon: 'fa-bell-concierge', label: 'Front desk' },
      { href: '/business/bookings', icon: 'fa-calendar-check', label: 'Bookings' },
      { href: '/business/availability', icon: 'fa-clock', label: 'Availability' },
      { href: '/business/booking-tools', icon: 'fa-sliders', label: 'Booking tools' },
      { href: '/business/payments', icon: 'fa-wallet', label: 'Payments' },
    ],
  },
  {
    id: 'team-ops',
    label: 'Team operations',
    icon: 'fa-people-roof',
    children: [
      { href: '/business/staff-schedule', icon: 'fa-calendar-week', label: 'Staff schedule' },
      { href: '/business/time-off', icon: 'fa-umbrella-beach', label: 'Time off & swaps' },
      { href: '/business/attendance', icon: 'fa-user-clock', label: 'Attendance' },
      { href: '/business/team-pay', icon: 'fa-money-check-dollar', label: 'Commission & pay' },
      { href: '/business/checklists', icon: 'fa-list-check', label: 'Checklists' },
    ],
  },
  {
    id: 'locations',
    label: 'Locations & team',
    icon: 'fa-network-wired',
    children: [
      { href: '/business/branches', icon: 'fa-location-dot', label: 'Branches' },
      { href: '/business/staff', icon: 'fa-user-tie', label: 'Staff' },
      { href: '/business/staff-services', icon: 'fa-handshake', label: 'Staff rates' },
    ],
  },
  {
    id: 'catalog',
    label: 'Catalog',
    icon: 'fa-tags',
    children: [
      { href: '/business/services', icon: 'fa-tags', label: 'Services' },
      { href: '/business/packages', icon: 'fa-gift', label: 'Packages', entitlement: 'packages' },
      { href: '/business/peak-pricing', icon: 'fa-bolt', label: 'Peak pricing', entitlement: 'peak_pricing' },
      { href: '/business/gallery', icon: 'fa-images', label: 'Gallery' },
    ],
  },
];

// ── Business staff (an employee with an app login) ────────────────
export const BUSINESS_STAFF_GROUPS: NavGroup[] = [
  {
    id: 'work',
    label: 'My work',
    icon: 'fa-bell-concierge',
    children: [
      { href: '/business/front-desk', icon: 'fa-bell-concierge', label: 'Front desk' },
      { href: '/business/bookings', icon: 'fa-calendar-check', label: 'Bookings' },
      { href: '/business/checklists', icon: 'fa-list-check', label: 'Checklists' },
    ],
  },
  {
    id: 'schedule',
    label: 'My schedule',
    icon: 'fa-calendar-week',
    children: [
      { href: '/business/staff-schedule', icon: 'fa-calendar-week', label: 'My shifts' },
      { href: '/business/availability', icon: 'fa-calendar-days', label: 'My availability' },
      { href: '/business/time-off', icon: 'fa-umbrella-beach', label: 'Time off & swaps' },
      { href: '/business/attendance', icon: 'fa-user-clock', label: 'Attendance' },
    ],
  },
  {
    id: 'me',
    label: 'My account',
    icon: 'fa-id-badge',
    children: [
      { href: '/business/staff-profile', icon: 'fa-id-badge', label: 'My profile' },
      { href: '/business/support', icon: 'fa-life-ring', label: 'Help & support' },
    ],
  },
];

/** Every page a staff login may open (the groups above, flattened). */
export const BUSINESS_STAFF_NAV: NavItem[] = BUSINESS_STAFF_GROUPS.flatMap((g) => g.children);

// ── Solo / individual providers ───────────────────────────────────
export const PROVIDER_NAV: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'fa-chart-pie',
    children: [
      { href: '/provider/dashboard', icon: 'fa-house', label: 'Dashboard' },
      { href: '/provider/analytics', icon: 'fa-chart-line', label: 'Reports' },
      { href: '/provider/plan', icon: 'fa-crown', label: 'Subscription' },
      { href: '/provider/verification', icon: 'fa-file-shield', label: 'Verification' },
      { href: '/provider/support', icon: 'fa-life-ring', label: 'Help & support' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: 'fa-calendar-check',
    children: [
      { href: '/provider/bookings', icon: 'fa-calendar-check', label: 'Bookings' },
      { href: '/provider/calendar', icon: 'fa-calendar-days', label: 'Calendar' },
      { href: '/provider/requests', icon: 'fa-inbox', label: 'Requests' },
      { href: '/provider/quotes', icon: 'fa-file-invoice-dollar', label: 'Quotes' },
      { href: '/provider/jobs', icon: 'fa-briefcase', label: 'Jobs' },
      { href: '/provider/customers', icon: 'fa-users', label: 'Customers' },
      { href: '/provider/availability', icon: 'fa-clock', label: 'Availability' },
      { href: '/provider/booking-tools', icon: 'fa-sliders', label: 'Booking tools' },
      { href: '/provider/front-desk', icon: 'fa-bell-concierge', label: 'Front desk' },
      { href: '/provider/payments', icon: 'fa-wallet', label: 'Payments' },
    ],
  },
  {
    id: 'coverage',
    label: 'Coverage & catalog',
    icon: 'fa-map-location-dot',
    children: [
      { href: '/provider/service-areas', icon: 'fa-map-location-dot', label: 'Service areas', entitlement: 'home_service' },
      { href: '/provider/services', icon: 'fa-tags', label: 'Services' },
      { href: '/provider/gallery', icon: 'fa-images', label: 'Gallery' },
    ],
  },
];

/** Business-only features: a solo provider who lands on these is sent to the provider dashboard. */
export const PROVIDER_BLOCKED_PREFIXES = [
  '/provider/staff',
  '/provider/staff-services',
  '/provider/staff-profile',
  '/provider/branches',
  '/provider/organization',
  '/provider/packages',
  '/provider/peak-pricing',
  '/provider/register',
  // Team operations need a team.
  '/provider/staff-schedule',
  '/provider/time-off',
  '/provider/attendance',
  '/provider/team-pay',
  '/provider/checklists',
];

/**
 * Solo-only features (their APIs accept individual listings only): a business owner who
 * lands on these is sent to the business dashboard. Businesses have no copy of these pages.
 */
export const BUSINESS_BLOCKED_PROVIDER_PREFIXES = [
  '/provider/analytics',
  '/provider/calendar',
  '/provider/quotes',
  '/provider/customers',
  '/provider/service-areas',
];
// Booking tools, walk-in queue and payments exist on both sides (shared components in
// components/workspace); a business owner on /provider/<x> is mapped to /business/<x>.

export const flatten = (groups: NavGroup[]) => groups.flatMap((g) => g.children);

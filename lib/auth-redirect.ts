/** Build a login URL that returns the user to the page they were on. */
export function loginHref(returnUrl: string): string {
  return `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`;
}

/** Build a register URL that returns the user after account creation. */
export function registerHref(returnUrl: string, role: 'customer' | 'business' = 'customer'): string {
  const params = new URLSearchParams({ role });
  params.set('returnUrl', returnUrl);
  return `/auth/register?${params.toString()}`;
}

/** Current in-app path including query string (browser only). */
export function currentReturnUrl(): string {
  if (typeof window === 'undefined') return '/profile/explore';
  return `${window.location.pathname}${window.location.search}`;
}

/** Safe in-app path only (blocks protocol-relative / external URLs). */
export function safeReturnUrl(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;
  return raw;
}

export function dashboardRouteForRole(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/admin/dashboard';
    case 'BUSINESS_OWNER':
    case 'BUSINESS_STAFF':
      return '/business/dashboard';
    default:
      return '/profile/explore';
  }
}

function isBookingReturnUrl(path: string): boolean {
  return path.startsWith('/profile/book/');
}

/**
 * Where to send a user after login/register.
 * Super Admin always goes to admin. Business accounts go to their dashboard
 * unless they were in the middle of a booking. Customers keep returnUrl.
 */
export function destinationAfterAuth(role: string, rawReturn: string | null): string {
  const dashboard = dashboardRouteForRole(role);
  const returnUrl = safeReturnUrl(rawReturn, dashboard);
  if (role === 'SUPER_ADMIN') {
    return dashboard;
  }
  if (role === 'BUSINESS_OWNER' || role === 'BUSINESS_STAFF') {
    return isBookingReturnUrl(returnUrl) ? returnUrl : dashboard;
  }
  if (isBookingReturnUrl(returnUrl)) {
    return returnUrl;
  }
  if (!rawReturn || returnUrl === '/profile/explore') {
    return '/onboarding';
  }
  return returnUrl;
}

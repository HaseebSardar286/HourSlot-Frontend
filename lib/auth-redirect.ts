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

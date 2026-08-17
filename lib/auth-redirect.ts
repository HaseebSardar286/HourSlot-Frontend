/** Build a login URL that returns the user to the page they were on. */
export function loginHref(returnUrl: string): string {
  return `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`;
}

/** Safe in-app path only (blocks protocol-relative / external URLs). */
export function safeReturnUrl(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;
  return raw;
}

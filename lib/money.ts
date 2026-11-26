/**
 * Format money using the business operating currency (e.g. PKR, USD, AED).
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currency = 'PKR',
  options?: Intl.NumberFormatOptions
): string {
  const value = Number(amount);
  const code = (currency || 'PKR').trim().toUpperCase() || 'PKR';
  const safe = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'symbol',
      ...options,
    }).format(safe);
  } catch {
    return `${code} ${safe.toFixed(2)}`;
  }
}

export function currencyCode(currency?: string | null): string {
  const code = (currency || 'PKR').trim().toUpperCase();
  return code || 'PKR';
}
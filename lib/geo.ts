import { apiFetch } from '@/lib/api';

export type CurrencyView = {
  code: string;
  name: string;
  symbol?: string;
};

export type CountryView = {
  code: string;
  iso3?: string;
  name: string;
  officialName?: string;
  flag?: string;
  region?: string;
  subregion?: string;
  capital?: string;
  timezones?: string[];
  currencies?: CurrencyView[];
};

export type RegionView = {
  name: string;
  code?: string | null;
};

export async function fetchCountries(): Promise<CountryView[]> {
  return apiFetch<CountryView[]>('/api/public/geo/countries', { skipAuth: true });
}

export async function fetchCurrencies(supportedOnly = false): Promise<CurrencyView[]> {
  const qs = supportedOnly ? '?supportedOnly=true' : '';
  return apiFetch<CurrencyView[]>(`/api/public/geo/currencies${qs}`, { skipAuth: true });
}

export async function fetchStates(country: string): Promise<RegionView[]> {
  return apiFetch<RegionView[]>(
    `/api/public/geo/states?country=${encodeURIComponent(country)}`,
    { skipAuth: true }
  );
}

export async function fetchCities(country: string, state: string): Promise<string[]> {
  return apiFetch<string[]>(
    `/api/public/geo/cities?country=${encodeURIComponent(country)}&state=${encodeURIComponent(state)}`,
    { skipAuth: true }
  );
}

export async function fetchTimezones(country?: string): Promise<string[]> {
  const qs = country ? `?country=${encodeURIComponent(country)}` : '';
  return apiFetch<string[]>(`/api/public/geo/timezones${qs}`, { skipAuth: true });
}

export function defaultCurrencyForCountry(country: CountryView | undefined): string {
  return country?.currencies?.[0]?.code || 'USD';
}

export function defaultTimezoneForCountry(country: CountryView | undefined): string {
  const iana = country?.timezones?.find((tz) => tz.includes('/'));
  return iana || country?.timezones?.[0] || 'UTC';
}

export async function geocodePlace(
  query: string
): Promise<{ lat: number; lon: number; displayName: string } | null> {
  if (!query.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    if (!data?.[0]) return null;
    return {
      lat: Number(data[0].lat),
      lon: Number(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch {
    return null;
  }
}

export function placeQuery(parts: { city?: string; region?: string; countryName?: string }): string {
  return [parts.city, parts.region, parts.countryName].filter(Boolean).join(', ');
}

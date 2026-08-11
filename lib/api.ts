/**
 * Typed API fetch wrapper — attaches Bearer token and refreshes on 401.
 */

import type { ApiError } from './types';

const STORAGE_KEY = 'hourslot_user_session';

function getSession(): Record<string, unknown> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return null;
}

function getToken(): string | null {
  const session = getSession();
  return (session?.token as string) ?? null;
}

function getRefreshToken(): string | null {
  const session = getSession();
  return (session?.refreshToken as string) ?? null;
}

function persistSession(session: Record<string, unknown>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  document.cookie = `${STORAGE_KEY}=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=86400; SameSite=Lax`;
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  document.cookie = `${STORAGE_KEY}=; path=/; max-age=0`;
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      const session = getSession() || {};
      persistSession({
        ...session,
        token: data.accessToken || data.token,
        refreshToken: data.refreshToken || refreshToken,
      });
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
  _retried?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { skipAuth = false, headers: extraHeaders, _retried, ...rest } = options;

  const headers: Record<string, string> = {
    ...(extraHeaders as Record<string, string>),
  };

  const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData;
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (!skipAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(path, { headers, ...rest });

  if (res.status === 401 && !skipAuth && !_retried) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, _retried: true });
    }
    clearSession();
  }

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({
      message: res.statusText,
    }))) as ApiError;
    throw errBody;
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (null as T);
}

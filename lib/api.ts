/**
 * Typed API fetch wrapper — automatically attaches Bearer token from session.
 * Mirrors the Angular JWT interceptor behaviour.
 */

const STORAGE_KEY = 'hourslot_user_session';

function getToken(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const session = JSON.parse(stored);
      return session?.token ?? null;
    }
  } catch {
    // ignore
  }
  return null;
}

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { skipAuth = false, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
  };

  if (!skipAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(path, { headers, ...rest });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ message: res.statusText }));
    throw errBody;
  }

  // 204 No Content — return null
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (null as T);
}

'use client';

import { apiFetch } from '@/lib/api';

export type PresenceSnapshot = {
  isOnline?: boolean;
  lastSeenAt?: string;
  lastLatitude?: number;
  lastLongitude?: number;
  presenceSource?: string;
  opsStatus?: string;
};

function readCoords(): Promise<{ latitude?: number; longitude?: number }> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve({}),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  });
}

const SHARE_KEY = 'duemet_share_location';

function hasOptedIn(): boolean {
  try {
    return window.localStorage.getItem(SHARE_KEY) === '1';
  } catch {
    return false;
  }
}

function setOptedIn(value: boolean) {
  try {
    if (value) window.localStorage.setItem(SHARE_KEY, '1');
    else window.localStorage.removeItem(SHARE_KEY);
  } catch {
    /* storage unavailable: treated as not opted in */
  }
}

/** Provider chose to stop sharing location (e.g. from settings). */
export function stopSharingLocation() {
  setOptedIn(false);
}

export async function pushPresence(online: boolean, source: string): Promise<PresenceSnapshot | null> {
  try {
    // Location is only read automatically at login if the provider already shared it by going online
    // themselves; an explicit action (any non-LOGIN source) is the opt-in.
    const explicit = source !== 'LOGIN';
    const mayRead = online && (explicit || hasOptedIn());
    if (online && explicit) setOptedIn(true);
    const coords = mayRead ? await readCoords() : {};
    return await apiFetch<PresenceSnapshot>('/api/provider/presence', {
      method: 'POST',
      body: JSON.stringify({
        online,
        latitude: coords.latitude ?? null,
        longitude: coords.longitude ?? null,
        source,
      }),
    });
  } catch {
    return null;
  }
}

export async function fetchPresence(): Promise<PresenceSnapshot | null> {
  try {
    return await apiFetch<PresenceSnapshot>('/api/provider/presence');
  } catch {
    return null;
  }
}

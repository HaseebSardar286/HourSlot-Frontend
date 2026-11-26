import { apiFetch } from './api';

/** Which owner workspace a shared page is rendered in. */
export type Workspace = 'business' | 'provider';

/** Endpoints that differ between a multi-staff business and a solo provider. */
export const WORKSPACE_API = {
  business: {
    services: '/api/business/services',
    payments: '/api/business/payments',
  },
  provider: {
    services: '/api/provider/services',
    payments: '/api/provider/ops/payments',
  },
} as const;

/** The public listing slug (used for the booking link and the queue screen). */
export async function fetchWorkspaceSlug(workspace: Workspace): Promise<string | null> {
  try {
    if (workspace === 'provider') {
      const ws = await apiFetch<{ slug?: string }>('/api/provider/workspace');
      return ws?.slug || null;
    }
    const profile = await apiFetch<{ slug?: string; business?: { slug?: string } }>('/api/business/profile');
    return profile?.slug || profile?.business?.slug || null;
  } catch {
    return null;
  }
}

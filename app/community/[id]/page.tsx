'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/** Old per-community URL: now a filter on the main feed. */
export default function CommunityRedirect() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/community?c=${id}`);
  }, [id, router]);
  return null;
}

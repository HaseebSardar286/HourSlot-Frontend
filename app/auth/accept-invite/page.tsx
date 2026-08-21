'use client';

import { Suspense } from 'react';
import AcceptInviteInner from './AcceptInviteInner';

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Loading invite…</div>}>
      <AcceptInviteInner />
    </Suspense>
  );
}

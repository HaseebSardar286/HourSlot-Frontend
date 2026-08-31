'use client';

import { Suspense } from 'react';
import AcceptInviteInner from './AcceptInviteInner';
import shared from '../auth-shared.module.css';

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className={shared.authCard} style={{ textAlign: 'center', padding: 40 }}>
          Loading invite…
        </div>
      }
    >
      <AcceptInviteInner />
    </Suspense>
  );
}

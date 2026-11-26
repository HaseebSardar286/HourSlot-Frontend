'use client';

import { useEffect, useState } from 'react';
import BookingTools from '@/components/provider/BookingTools';
import PromoCodesPanel from '@/components/provider/PromoCodesPanel';
import { fetchWorkspaceSlug, type Workspace } from '@/lib/workspace-api';
import s from './tools.module.css';

export default function BookingToolsPage({ workspace }: { workspace: Workspace }) {
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);

  useEffect(() => {
    void fetchWorkspaceSlug(workspace).then((slug) => {
      setBookingUrl(slug ? `${window.location.origin}/b/${encodeURIComponent(slug)}` : null);
    });
  }, [workspace]);

  return (
    <div className={s.page}>
      <header className={s.head}>
        <div>
          <h1>Booking tools</h1>
          <p>Share your booking link, set your cancellation rules, run promo codes and sync bookings to your calendar.</p>
        </div>
      </header>
      <div className={s.split}>
        <div className={s.stack}>
          <BookingTools bookingUrl={bookingUrl} slot="main" />
          <PromoCodesPanel />
        </div>
        <aside className={s.sticky}>
          <BookingTools bookingUrl={bookingUrl} slot="side" />
        </aside>
      </div>
    </div>
  );
}

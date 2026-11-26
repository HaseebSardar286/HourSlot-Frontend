'use client';

import SubscriptionBilling from '@/components/workspace/SubscriptionBilling';
import s from '@/components/workspace/tools.module.css';

export default function SoloPlanPage() {
  return (
    <div className={s.page}>
      <header className={s.head}>
        <div>
          <h1>Subscription</h1>
          <p>Your Duemet plan and invoices. You pay Duemet directly by bank or wallet; nothing is charged automatically.</p>
        </div>
      </header>
      <SubscriptionBilling />
    </div>
  );
}

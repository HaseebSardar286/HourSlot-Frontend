import { redirect } from 'next/navigation';

/** The walk-in queue is part of the front desk now. */
export default function BusinessQueuePage() {
  redirect('/business/front-desk');
}

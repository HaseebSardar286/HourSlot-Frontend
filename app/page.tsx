import { redirect } from 'next/navigation';

/** Root page — always redirects. Actual routing handled by middleware. */
export default function RootPage() {
  redirect('/auth/login');
}

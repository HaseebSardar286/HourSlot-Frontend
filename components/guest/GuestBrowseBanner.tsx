'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { loginHref, registerHref } from '@/lib/auth-redirect';
import styles from './guest.module.css';

interface GuestBrowseBannerProps {
  variant?: 'default' | 'booking';
}

function GuestBrowseBannerInner({ variant = 'default' }: GuestBrowseBannerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const returnUrl = `${pathname}${qs ? `?${qs}` : ''}`;

  if (variant === 'booking') {
    return (
      <div className={styles.bookingGuestNote}>
        <i className="fa-solid fa-circle-info" aria-hidden />
        <span>
          <strong>No account needed yet.</strong> Pick your service and time — you&apos;ll sign in at the
          final step to confirm.
        </span>
      </div>
    );
  }

  return (
    <div className={styles.browseBanner}>
      <div className={styles.browseBannerText}>
        <span className={styles.browseBannerIcon}>
          <i className="fa-solid fa-store" aria-hidden />
        </span>
        <div>
          <strong>Guest view</strong>
          <span>
            You can browse this profile freely. Sign in to save favorites, buy packages, or complete a booking.
          </span>
        </div>
      </div>
      <div className={styles.browseBannerActions}>
        <Link href={loginHref(returnUrl)} className="btn btn-outline btn-sm">
          Sign in
        </Link>
        <Link href={registerHref(returnUrl)} className="btn btn-cool btn-sm">
          Register
        </Link>
      </div>
    </div>
  );
}

export default function GuestBrowseBanner(props: GuestBrowseBannerProps) {
  return <GuestBrowseBannerInner {...props} />;
}

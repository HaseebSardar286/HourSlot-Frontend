import styles from './guest.module.css';

const CHIPS = [
  { icon: 'fa-compass', label: 'Browse without signing in', tone: 'chipTeal' },
  { icon: 'fa-calendar-check', label: 'Real-time availability', tone: 'chipCoral' },
  { icon: 'fa-shield-halved', label: 'Admin-reviewed listings', tone: 'chipViolet' },
  { icon: 'fa-lock-open', label: 'Sign in only to book', tone: 'chipSky' },
] as const;

export default function GuestTrustStrip() {
  return (
    <div className={styles.trustStrip}>
      {CHIPS.map((chip) => (
        <span key={chip.label} className={`${styles.trustChip} ${styles[chip.tone]}`}>
          <i className={`fa-solid ${chip.icon}`} aria-hidden />
          {chip.label}
        </span>
      ))}
    </div>
  );
}

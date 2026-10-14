import Reveal from '@/components/Reveal';
import styles from './landing.module.css';

const LINES = [
  'Salons',
  'Clinics',
  'Barbers',
  'Wellness',
  'Fitness',
  'Home services',
  'Independents',
];

export default function LandingAtmosphere() {
  return (
    <Reveal as="section" className={styles.atmosphere}>
      <div className={styles.atmosphereInner}>
        <p className={styles.atmosphereLead}>Built for the hours people actually book</p>
        <div className={styles.ticker} aria-hidden>
          <div className={styles.tickerTrack}>
            {[...LINES, ...LINES].map((line, i) => (
              <span key={`${line}-${i}`}>{line}</span>
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

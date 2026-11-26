import { STEPS } from './data';
import Reveal from '@/components/Reveal';
import styles from './landing.module.css';
import { BookingWebMockup } from './ProductMockups';

export default function LandingHowItWorks() {
  return (
    <Reveal as="section" className={`${styles.band} ${styles.bandAlt}`} id="how">
      <div className={`${styles.wrap} ${styles.howGrid}`}>
        <BookingWebMockup />

        <div className={styles.howCopy}>
          <p className={styles.eyebrow}>How it works</p>
          <h2 className={styles.displayTitle}>From search to a confirmed seat</h2>
          <p className={styles.sectionSub}>
            Every slot you see comes from the provider&apos;s live calendar, so what you book is
            what&apos;s actually open.
          </p>

          <ol className={styles.stepList}>
            {STEPS.map((step) => (
              <li key={step.num} className={styles.stepItem}>
                <span className={styles.stepNum}>{step.num}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Reveal>
  );
}

import Reveal from '@/components/Reveal';
import { CAPABILITIES } from './data';
import styles from './landing.module.css';

export default function LandingCapabilities() {
  return (
    <Reveal as="section" className={styles.band} id="capabilities">
      <div className={styles.wrap}>
        <div className={styles.sectionHeadCenter}>
          <p className={styles.eyebrow}>Platform</p>
          <h2 className={styles.displayTitle}>Built for both sides of the booking</h2>
          <p className={styles.sectionSub}>
            The same calm tools customers and providers already use after sign-in.
          </p>
        </div>

        <div className={`${styles.capGrid} hs-stagger`}>
          {CAPABILITIES.map((item, i) => (
            <article key={item.title} className={styles.capItem}>
              <span className={styles.capIndex}>0{i + 1}</span>
              <span className={styles.capIcon}>
                <i className={`fa-solid ${item.icon}`} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

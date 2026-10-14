import Link from 'next/link';
import Reveal from '@/components/Reveal';
import { PATHS } from './data';
import styles from './landing.module.css';

export default function LandingPaths() {
  return (
    <Reveal as="section" className={styles.band} id="paths">
      <div className={styles.wrap}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Get started</p>
            <h2 className={styles.displayTitle}>Choose your path</h2>
            <p className={styles.sectionSub}>Customer, individual professional, or business.</p>
          </div>
        </div>

        <div className={`${styles.pathList} hs-stagger`}>
          {PATHS.map((path) => (
            <Link key={path.title} href={path.href} className={styles.pathRow}>
              <span className={styles.pathLabel}>{path.title}</span>
              <span className={styles.pathText}>{path.text}</span>
              <span className={styles.pathCta}>
                {path.cta} <i className="fa-solid fa-arrow-right" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

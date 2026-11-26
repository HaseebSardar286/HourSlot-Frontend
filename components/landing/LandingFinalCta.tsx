import Reveal from '@/components/Reveal';
import Link from 'next/link';
import styles from './landing.module.css';
import { CtaChips } from './ProductMockups';

export default function LandingFinalCta() {
  return (
    <Reveal as="section" className={styles.finalCta}>
      <div className={styles.finalPanel}>
        <CtaChips />
        <div className={styles.finalCopy}>
          <h2 className={styles.finalTitle}>Your next appointment is a search away.</h2>
          <p>Create a free account to book, reschedule and keep every visit in one place.</p>
          <div className={styles.inlineActions}>
            <Link href="/auth/register" className={styles.btnOnDark}>
              Create a free account
            </Link>
            <Link href="/profile/explore" className={styles.btnOutlineOnDark}>
              Explore providers
            </Link>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

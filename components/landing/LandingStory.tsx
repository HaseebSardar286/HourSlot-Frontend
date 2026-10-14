import Link from 'next/link';
import Image from 'next/image';
import Reveal from '@/components/Reveal';
import { STORY_POINTS } from './data';
import styles from './landing.module.css';

export default function LandingStory() {
  return (
    <Reveal as="section" className={styles.story} id="why">
      <div className={styles.storyMedia}>
        <Image
          src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1600&q=80"
          alt="Bright appointment studio"
          fill
          sizes="(max-width: 900px) 100vw, 52vw"
          className={styles.storyImg}
        />
      </div>
      <div className={styles.storyCopy}>
        <p className={styles.eyebrow}>Why HourSlot</p>
        <h2 className={styles.displayTitle}>Honest openings. Less back-and-forth.</h2>
        <p className={styles.sectionSub}>
          Discovery and booking stay in one workspace — so you spend less time chasing
          confirmations and more time on the visit itself.
        </p>
        <ul className={styles.bulletList}>
          {STORY_POINTS.map((point) => (
            <li key={point}>
              <i className="fa-solid fa-check" aria-hidden />
              {point}
            </li>
          ))}
        </ul>
        <Link href="/profile/explore" className={styles.btnPrimary}>
          Browse nearby
        </Link>
      </div>
    </Reveal>
  );
}

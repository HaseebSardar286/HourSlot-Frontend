import Reveal from '@/components/Reveal';
import { categoryPhoto } from './utils';
import styles from './landing.module.css';

const FEATURES = [
  {
    icon: 'fa-solid fa-calendar-check',
    tone: '#2563eb',
    title: 'Live calendars',
    text: 'Every slot comes straight from the provider’s schedule, so what you see is what is actually open.',
  },
  {
    icon: 'fa-solid fa-wallet',
    tone: '#059669',
    title: 'Pay your way',
    text: 'Pay at the venue, or by bank transfer or wallet with a screenshot as proof. Prices are always in PKR.',
  },
  {
    icon: 'fa-solid fa-bell',
    tone: '#d97706',
    title: 'Email and in-app updates',
    text: 'Confirmations, payment checks and changes reach both you and the provider the moment they happen.',
  },
  {
    icon: 'fa-solid fa-rotate',
    tone: '#7c3aed',
    title: 'Reschedule in two taps',
    text: 'Plans change. Move or cancel a booking from your account without calling anyone.',
  },
  {
    icon: 'fa-solid fa-shield-halved',
    tone: '#0891b2',
    title: 'Verified providers',
    text: 'Businesses and independents are reviewed before they go live on the marketplace.',
  },
  {
    icon: 'fa-solid fa-star',
    tone: '#e11d48',
    title: 'Ratings from real visits',
    text: 'Only customers who booked can leave a review, so ratings reflect real appointments.',
  },
];

export default function LandingFeatures() {
  return (
    <Reveal as="section" className={styles.featBand} id="features">
      <div className={styles.wrap}>
        <div className={styles.featHead}>
          <p className={styles.eyebrow}>Why Duemet</p>
          <h2 className={styles.displayTitle}>Built around the appointment, not the phone call</h2>
          <p className={styles.sectionSub}>
            Everything a customer and a provider need from search to a confirmed visit, in one place.
          </p>
        </div>
        <div className={`${styles.featGrid} hs-stagger`}>
          <div className={styles.featPhoto}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={categoryPhoto('Beauty & Salons')} alt="" loading="lazy" />
            <div className={styles.featPhotoNote}>
              <span className={styles.featPhotoDot} aria-hidden><i className="fa-solid fa-check" /></span>
              <div><strong>Booking confirmed</strong><span>Pay at venue · PKR, no booking fee</span></div>
            </div>
          </div>
          {FEATURES.map((f) => (
            <article key={f.title} className={styles.featCard} style={{ ['--tone' as string]: f.tone }}>
              <span className={styles.featIcon} aria-hidden><i className={f.icon} /></span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

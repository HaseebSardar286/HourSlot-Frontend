'use client';

import { useState } from 'react';
import Reveal from '@/components/Reveal';
import { FAQ } from './data';
import styles from './landing.module.css';

export default function LandingFaq() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <Reveal as="section" className={styles.band} id="faq">
      <div className={styles.wrap}>
        <div className={styles.faqLayout}>
          <div>
            <p className={styles.eyebrow}>FAQ</p>
            <h2 className={styles.displayTitle}>Before you book</h2>
            <p className={styles.sectionSub}>Short answers for every account type.</p>
            <div className={styles.faqHelp}>
              <span className={styles.faqHelpIcon} aria-hidden><i className="fa-solid fa-headset" /></span>
              <strong>Still have a question?</strong>
              <p>Send us a message and we will help you get booked.</p>
              <a href="mailto:hello@duemet.app" className={styles.textLink}>
                Email support <i className="fa-solid fa-arrow-right" />
              </a>
            </div>
          </div>
          <div className={`${styles.faqList} hs-stagger`}>
            {FAQ.map((item, i) => (
              <div key={item.q} className={`${styles.faqItem} ${openFaq === i ? styles.faqOpen : ''}`}>
                <button
                  type="button"
                  className={styles.faqBtn}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  {item.q}
                  <i className={`fa-solid ${openFaq === i ? 'fa-minus' : 'fa-plus'}`} />
                </button>
                {openFaq === i && <p className={`${styles.faqAnswer} hs-fade-in`}>{item.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

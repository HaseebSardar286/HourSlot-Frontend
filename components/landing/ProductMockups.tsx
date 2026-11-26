/**
 * Illustrations of Duemet's own screens for the landing page, built in HTML/CSS so they stay
 * sharp, match the live theme and show the product (not a particular business).
 * Purely decorative: every mockup is aria-hidden; the surrounding copy carries the meaning.
 */
import s from './mockups.module.css';

const RESULTS = [
  { name: 'Fade Lab Barbers', meta: 'Barber · DHA Phase 6', rating: '4.8', slots: ['4:30', '5:15', '6:00'], tone: '#2563eb' },
  { name: 'Clifton Skin Studio', meta: 'Skin clinic · Clifton', rating: '4.9', slots: ['3:00', '4:45'], tone: '#0891b2' },
  { name: 'Ayesha Malik Makeup', meta: 'Makeup artist · comes to you', rating: '5.0', slots: ['7:00'], tone: '#db2777' },
];

/** Hero: the Explore screen (list + map) in a browser frame, with floating booking cards. */
export function HeroMockup() {
  return (
    <div className={s.heroStage} aria-hidden>
      <div className={s.browser}>
        <div className={s.browserBar}>
          <span className={s.dots}><i /><i /><i /></span>
          <span className={s.address}><i className="fa-solid fa-lock" /> duemet.app/explore</span>
        </div>
        <div className={s.explore}>
          <div className={s.exploreList}>
            <div className={s.searchPill}>
              <i className="fa-solid fa-magnifying-glass" /> Haircut <span>· Near me</span>
            </div>
            {RESULTS.map((r, i) => (
              <div key={r.name} className={`${s.result} ${i === 0 ? s.resultOn : ''}`}>
                <span className={s.logo} style={{ background: r.tone }}>{r.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
                <div className={s.resultMain}>
                  <strong>{r.name}</strong>
                  <em>{r.meta}</em>
                  <div className={s.slots}>
                    {r.slots.map((t, j) => <span key={t} className={i === 0 && j === 0 ? s.slotOn : ''}>{t}</span>)}
                  </div>
                </div>
                <span className={s.rating}><i className="fa-solid fa-star" />{r.rating}</span>
              </div>
            ))}
          </div>
          <div className={s.map}>
            <span className={s.road1} />
            <span className={s.road2} />
            <span className={s.road3} />
            <span className={s.park} />
            <span className={`${s.pin} ${s.pinOn}`} style={{ left: '38%', top: '34%' }}>PKR 1,500</span>
            <span className={s.pin} style={{ left: '62%', top: '58%' }}>PKR 4,200</span>
            <span className={s.pin} style={{ left: '22%', top: '68%' }}>PKR 4,500</span>
            <span className={s.you} style={{ left: '48%', top: '50%' }} />
          </div>
        </div>
      </div>

      <div className={`${s.float} ${s.floatConfirm}`}>
        <span className={s.check}><i className="fa-solid fa-check" /></span>
        <div>
          <strong>Booking confirmed</strong>
          <em>Haircut · Today, 4:30 PM</em>
        </div>
      </div>
      <div className={`${s.float} ${s.floatLive}`}>
        <span className={s.liveDot} />
        <strong>12</strong> slots open near you
      </div>
    </div>
  );
}

const DAYS = [
  { d: 'Mon', n: 18 },
  { d: 'Tue', n: 19 },
  { d: 'Wed', n: 20 },
  { d: 'Thu', n: 21 },
  { d: 'Fri', n: 22 },
];
const TIMES = ['10:00', '10:45', '11:30', '1:15', '2:00', '3:30', '4:30', '5:15', '6:00'];
const TAKEN = new Set(['10:45', '2:00', '5:15']);

/** How it works: the web booking step (service, day, open slots, confirm) in a browser frame. */
export function BookingWebMockup() {
  return (
    <div className={s.phoneStage} aria-hidden>
      <div className={`${s.browser} ${s.bookBrowser}`}>
        <div className={s.browserBar}>
          <span className={s.dots}><i /><i /><i /></span>
          <span className={s.address}><i className="fa-solid fa-lock" /> duemet.app/b/fade-lab/book</span>
        </div>
        <div className={s.phone}>
          <div className={s.phoneHead}>
            <span>Fade Lab Barbers</span>
            <i className="fa-regular fa-heart" />
          </div>
          <div className={s.steps}>
            <span className={s.stepDone}>Service</span>
            <span className={s.stepOn}>Time</span>
            <span>Confirm</span>
          </div>
          <div className={s.serviceCard}>
            <div>
              <strong>Skin fade</strong>
              <em>45 min · with Bilal</em>
            </div>
            <b>PKR 1,800</b>
          </div>
          <div className={s.label}>Thursday, 21 November</div>
          <div className={s.dayStrip}>
            {DAYS.map((x) => (
              <span key={x.n} className={x.n === 21 ? s.dayOn : ''}>
                <em>{x.d}</em>
                <b>{x.n}</b>
              </span>
            ))}
          </div>
          <div className={s.label}>Open times</div>
          <div className={s.timeGrid}>
            {TIMES.map((t) => (
              <span key={t} className={t === '4:30' ? s.timeOn : TAKEN.has(t) ? s.timeTaken : ''}>{t}</span>
            ))}
          </div>
          <div className={s.phoneCta}>Confirm 4:30 PM</div>
        </div>
      </div>
      <div className={`${s.float} ${s.floatPhone}`}>
        <span className={s.bell}><i className="fa-solid fa-bell" /></span>
        <div>
          <strong>Reminder set</strong>
          <em>We&apos;ll ping you 2 hours before</em>
        </div>
      </div>
    </div>
  );
}

const STAFF = [
  { name: 'Bilal', blocks: [{ top: 6, h: 22, label: 'Skin fade', tone: 'a' }, { top: 52, h: 30, label: 'Cut & beard', tone: 'b' }] },
  { name: 'Usman', blocks: [{ top: 18, h: 18, label: 'Haircut', tone: 'c' }, { top: 62, h: 18, label: 'Beard trim', tone: 'a' }] },
  { name: 'Ali', blocks: [{ top: 34, h: 26, label: 'Cut & beard', tone: 'b' }] },
];

/** Providers band: the owner dashboard (today's numbers + staff schedule). */
export function DashboardMockup() {
  return (
    <div className={s.dashStage} aria-hidden>
      <div className={s.dash}>
        <div className={s.dashSide}>
          <span className={s.dashBrand} />
          {['fa-house', 'fa-calendar-check', 'fa-people-line', 'fa-user-tie', 'fa-tags', 'fa-wallet'].map((ic, i) => (
            <span key={ic} className={i === 1 ? s.dashNavOn : ''}><i className={`fa-solid ${ic}`} /></span>
          ))}
        </div>
        <div className={s.dashMain}>
          <div className={s.dashTop}>
            <strong>Today</strong>
            <span className={s.dashLive}><i /> Live on Explore</span>
          </div>
          <div className={s.kpis}>
            <div><em>Bookings</em><b>14</b><small className={s.up}>+3 vs last Thu</small></div>
            <div><em>Revenue</em><b>PKR 22.8k</b><small className={s.up}>+12%</small></div>
            <div><em>Walk-ins</em><b>5</b><small>2 waiting</small></div>
          </div>
          <div className={s.schedule}>
            <div className={s.hours}>
              {['10', '12', '2', '4', '6'].map((h) => <span key={h}>{h}</span>)}
            </div>
            {STAFF.map((st) => (
              <div key={st.name} className={s.lane}>
                <span className={s.laneName}>{st.name}</span>
                <div className={s.laneTrack}>
                  {st.blocks.map((b) => (
                    <span key={b.label + b.top} className={`${s.block} ${s[`block_${b.tone}`]}`}
                      style={{ top: `${b.top}%`, height: `${b.h}%` }}>{b.label}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={`${s.float} ${s.floatNew}`}>
        <span className={s.check}><i className="fa-solid fa-calendar-plus" /></span>
        <div>
          <strong>New booking</strong>
          <em>Sara A. · Skin fade · 4:30 PM</em>
        </div>
      </div>
    </div>
  );
}

/** Final call to action: soft UI chips floating over the brand gradient. */
export function CtaChips() {
  return (
    <div className={s.ctaChips} aria-hidden>
      <div className={`${s.chip} ${s.chipA}`}>
        <span className={s.check}><i className="fa-solid fa-check" /></span>
        <div><strong>Confirmed</strong><em>Tomorrow, 11:30 AM</em></div>
      </div>
      <div className={`${s.chip} ${s.chipB}`}>
        <span className={s.star}><i className="fa-solid fa-star" /></span>
        <div><strong>4.9 average</strong><em>from verified visits</em></div>
      </div>
      <div className={`${s.chip} ${s.chipC}`}>
        <span className={s.bell}><i className="fa-solid fa-rotate" /></span>
        <div><strong>Rescheduled</strong><em>in two taps</em></div>
      </div>
    </div>
  );
}

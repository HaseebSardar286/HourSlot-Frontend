'use client';

import styles from './ui.module.css';

export interface CalendarEvent {
  id: string | number;
  date: string; // YYYY-MM-DD
  title: string;
  time?: string;
}

interface CalendarViewProps {
  month: Date;
  events: CalendarEvent[];
  onMonthChange: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function CalendarView({ month, events, onMonthChange, onEventClick }: CalendarViewProps) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const todayKey = toKey(new Date());

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = startPad - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, m, -i), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, m, d), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }

  const byDate = new Map<string, CalendarEvent[]>();
  events.forEach((e) => {
    const list = byDate.get(e.date) || [];
    list.push(e);
    byDate.set(e.date, list);
  });

  const title = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className={styles.calWrap}>
      <div className={styles.calToolbar}>
        <h3 className={styles.calTitle}>{title}</h3>
        <div className={styles.calNav}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: '6px 12px' }}
            onClick={() => onMonthChange(new Date(year, m - 1, 1))}
            aria-label="Previous month"
          >
            <i className="fa-solid fa-chevron-left" />
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '6px 12px' }}
            onClick={() => onMonthChange(new Date())}
          >
            Today
          </button>
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: '6px 12px' }}
            onClick={() => onMonthChange(new Date(year, m + 1, 1))}
            aria-label="Next month"
          >
            <i className="fa-solid fa-chevron-right" />
          </button>
        </div>
      </div>
      <div className={styles.calGrid}>
        {DAY_NAMES.map((d) => (
          <div key={d} className={styles.calDayHead}>
            {d}
          </div>
        ))}
        {cells.map((cell, idx) => {
          const key = toKey(cell.date);
          const dayEvents = byDate.get(key) || [];
          const isToday = key === todayKey;
          return (
            <div
              key={idx}
              className={`${styles.calCell} ${!cell.inMonth ? styles.calMuted : ''} ${isToday ? styles.calToday : ''}`}
            >
              <div className={styles.calDateNum}>{cell.date.getDate()}</div>
              {dayEvents.slice(0, 3).map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  className={styles.calEvent}
                  onClick={() => onEventClick?.(ev)}
                  title={ev.title}
                >
                  {ev.time ? `${ev.time} ` : ''}
                  {ev.title}
                </button>
              ))}
              {dayEvents.length > 3 && (
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  +{dayEvents.length - 3} more
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

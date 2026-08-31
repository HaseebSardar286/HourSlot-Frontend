'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import styles from './CustomTimePicker.module.css';

interface CustomTimePickerProps {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
  disabled?: boolean;
  intervalMinutes?: number; // e.g. 10, 30, 60, 120
  id?: string;
}

function formatTo12Hour(timeStr: string) {
  if (!timeStr) return '';
  try {
    const parts = timeStr.split(':');
    const hour = parseInt(parts[0], 10);
    const minStr = parts[1] || '00';
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${minStr} ${period}`;
  } catch {
    return timeStr;
  }
}

export default function CustomTimePicker({
  value,
  onChange,
  disabled = false,
  intervalMinutes = 30,
  id,
}: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate time options dynamically based on interval
  const timeOptions = useMemo(() => {
    const options = [];
    const step = intervalMinutes || 30;
    for (let minutes = 0; minutes < 24 * 60; minutes += step) {
      const hour = Math.floor(minutes / 60);
      const min = minutes % 60;
      const hourStr = String(hour).padStart(2, '0');
      const minStr = String(min).padStart(2, '0');
      const timeVal = `${hourStr}:${minStr}`;
      
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      const displayLabel = `${displayHour}:${minStr} ${period}`;
      
      options.push({ value: timeVal, label: displayLabel });
    }
    return options;
  }, [intervalMinutes]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = useMemo(() => {
    return timeOptions.find((opt) => opt.value === value) || { value, label: formatTo12Hour(value) };
  }, [value, timeOptions]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.timePickerContainer} ${disabled ? styles.disabled : ''} ${isOpen ? styles.open : ''}`}
      id={id}
    >
      <button
        type="button"
        className={styles.timeTrigger}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={styles.triggerLabel}>
          <i className="fa-regular fa-clock className={styles.clockIcon}" />
          {selectedOption.label || 'Select time'}
        </span>
        <i className="fa-solid fa-chevron-down className={styles.chevron}" />
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          <ul className={styles.optionsList} role="listbox">
            {timeOptions.map((opt) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                className={`${styles.optionItem} ${opt.value === value ? styles.selectedItem : ''}`}
                onClick={() => handleSelect(opt.value)}
              >
                <span>{opt.label}</span>
                {opt.value === value && (
                  <i className="fa-solid fa-circle-check className={styles.checkIcon}" />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './CustomSelect.module.css';

interface Option {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  loading?: boolean;
  id?: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  searchable = true,
  disabled = false,
  loading = false,
  id,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search when dropdown closes
  useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(search.toLowerCase())) ||
      opt.value.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.selectContainer} ${disabled ? styles.disabled : ''} ${isOpen ? styles.open : ''}`}
      id={id}
    >
      <button
        type="button"
        className={styles.selectTrigger}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={styles.triggerContent}>
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className={styles.optionIcon}>{selectedOption.icon}</span>}
              <span className={styles.optionText}>
                {selectedOption.label}
                {selectedOption.sublabel && (
                  <span className={styles.optionSubText}> ({selectedOption.sublabel})</span>
                )}
              </span>
            </>
          ) : (
            <span className={styles.placeholder}>{placeholder}</span>
          )}
        </span>
        <span className={styles.chevron}>
          {loading ? (
            <i className="fa-solid fa-spinner fa-spin" />
          ) : (
            <i className="fa-solid fa-chevron-down" />
          )}
        </span>
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          {searchable && (
            <div className={styles.searchWrapper}>
              <i className="fa-solid fa-magnifying-glass styles.searchIcon" />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          )}

          <ul className={styles.optionsList} role="listbox">
            {loading ? (
              <li className={styles.loadingState}>
                <i className="fa-solid fa-spinner fa-spin" /> Loading options...
              </li>
            ) : filteredOptions.length === 0 ? (
              <li className={styles.emptyState}>No options found</li>
            ) : (
              filteredOptions.map((opt) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={opt.value === value}
                  className={`${styles.optionItem} ${opt.value === value ? styles.selectedItem : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  <div className={styles.optionInfo}>
                    {opt.icon && <span className={styles.optionIcon}>{opt.icon}</span>}
                    <div className={styles.optionMeta}>
                      <span className={styles.optionTitle}>{opt.label}</span>
                      {opt.sublabel && <span className={styles.optionSubtext}>{opt.sublabel}</span>}
                    </div>
                  </div>
                  {opt.value === value && (
                    <span className={styles.check}>
                      <i className="fa-solid fa-circle-check" />
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

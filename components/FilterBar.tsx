'use client';

import { ReactNode } from 'react';
import styles from './ui.module.css';

export default function FilterBar({ children }: { children: ReactNode }) {
  return <div className={styles.filterBar}>{children}</div>;
}

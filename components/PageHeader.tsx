'use client';

import { ReactNode } from 'react';
import styles from './ui.module.css';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className={styles.pageHeader}>
      <div className={styles.pageHeaderText}>
        <h1 className={styles.pageHeaderTitle}>{title}</h1>
        {subtitle && <p className={styles.pageHeaderSubtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.pageHeaderActions}>{actions}</div>}
    </div>
  );
}

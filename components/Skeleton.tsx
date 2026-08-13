'use client';

import styles from './ui.module.css';

interface SkeletonProps {
  variant?: 'text' | 'title' | 'card' | 'row';
  width?: string | number;
  height?: string | number;
  count?: number;
  className?: string;
}

export default function Skeleton({
  variant = 'text',
  width,
  height,
  count = 1,
  className = '',
}: SkeletonProps) {
  const variantClass =
    variant === 'title'
      ? styles.skeletonTitle
      : variant === 'card'
        ? styles.skeletonCard
        : variant === 'row'
          ? styles.skeletonRow
          : styles.skeletonText;

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${styles.skeleton} ${variantClass} ${className}`}
          style={{ width, height }}
          aria-hidden
        />
      ))}
    </>
  );
}

'use client';

import { ReactNode, useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import styles from './ui.module.css';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

const noopSubscribe = () => () => {};

export default function Modal({ open, title, onClose, children, footer, wide }: ModalProps) {
  // True only in the browser, where document.body exists for the portal.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  // Rendered into <body> so no page wrapper (transforms, sticky headers) can sit on top of it.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={styles.modalOverlay}
      onClick={onClose}
    >
      <div
        className={styles.modalPanel}
        style={wide ? { maxWidth: 960 } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close dialog">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div>{children}</div>
        {footer && <div className={styles.modalFooter}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

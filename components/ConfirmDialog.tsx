'use client';

import { ReactNode } from 'react';
import Modal from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const footer: ReactNode = (
    <>
      <button type="button" className="btn btn-outline" onClick={onCancel} disabled={loading}>
        {cancelLabel}
      </button>
      <button
        type="button"
        className={`btn ${danger ? 'btn-primary' : 'btn-primary'}`}
        style={danger ? { background: 'linear-gradient(135deg, #dc2626, #ef4444)' } : undefined}
        onClick={onConfirm}
        disabled={loading}
      >
        {loading ? <span className="spinner" /> : confirmLabel}
      </button>
    </>
  );

  return (
    <Modal open={open} title={title} onClose={onCancel} footer={footer}>
      <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{message}</p>
    </Modal>
  );
}

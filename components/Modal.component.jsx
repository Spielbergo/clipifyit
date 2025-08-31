import React, { useEffect } from 'react';
import styles from './modal.module.css';

export default function Modal({ open, onClose, onPrimary, children, hideClose = false }) {
  if (!open) return null;
  // Global Shift+Enter to trigger the modal's primary action when provided
  useEffect(() => {
    if (!open || !onPrimary) return;
    const onKey = (e) => {
      if (e.shiftKey && (e.key === 'Enter' || e.code === 'Enter')) {
        e.preventDefault();
        try { onPrimary(); } catch {}
      }
      if (e.key === 'Escape' && onClose) {
        // common escape-to-close affordance
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onPrimary, onClose]);
  return (
    <div className={styles.modal_overlay} onClick={onClose}>
      <div className={styles.modal_content} onClick={e => e.stopPropagation()}>
        {!hideClose && (
          <button className={styles.modal_close} onClick={onClose} aria-label="Close">&times;</button>
        )}
        {children}
      </div>
    </div>
  );
}
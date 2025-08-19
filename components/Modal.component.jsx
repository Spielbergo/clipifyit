import React from 'react';
import styles from './modal.module.css';

export default function Modal({ open, onClose, children, hideClose = false }) {
  if (!open) return null;
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
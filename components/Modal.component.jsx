import React, { useEffect, useRef } from 'react';
import styles from './modal.module.css';

// Accessible modal with focus trap & labeling
export default function Modal({
  open,
  onClose,
  onPrimary,
  children,
  hideClose = false,
  ariaLabel,
  labelledById,
  describedById,
  contentClassName,
  overlayClassName
}) {
  const contentRef = useRef(null);
  const overlayRef = useRef(null);
  const prevFocusRef = useRef(null);

  // Focus management & trap - always register hook, guard by open
  useEffect(() => {
    if (!open) return; // guard to keep hook order stable
    prevFocusRef.current = document.activeElement;
    const focusables = () => Array.from(contentRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.disabled && el.offsetParent !== null);
    const first = focusables()[0];
    (first || contentRef.current)?.focus?.();

    const onKey = (e) => {
      if (e.shiftKey && (e.key === 'Enter' || e.code === 'Enter') && onPrimary) {
        e.preventDefault();
        try { onPrimary(); } catch {}
        return;
      }
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const items = focusables();
        if (!items.length) {
          e.preventDefault();
          contentRef.current.focus();
          return;
        }
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === firstEl || document.activeElement === contentRef.current) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', onKey);

    const siblings = Array.from(document.body.children).filter(ch => ch !== overlayRef.current);
    siblings.forEach(el => el.setAttribute('aria-hidden', 'true'));

    return () => {
      document.removeEventListener('keydown', onKey);
      siblings.forEach(el => el.removeAttribute('aria-hidden'));
      if (prevFocusRef.current && prevFocusRef.current.focus) {
        try { prevFocusRef.current.focus(); } catch {}
      }
    };
  }, [open, onPrimary, onClose]);

  return open ? (
    <div
      ref={overlayRef}
      className={`${styles.modal_overlay} ${overlayClassName || ''}`}
      onClick={onClose}
      data-modal-root
    >
      <div
        ref={contentRef}
        className={`${styles.modal_content} ${contentClassName || ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={labelledById}
        aria-describedby={describedById}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
      >
        {!hideClose && (
          <button
            className={styles.modal_close}
            onClick={onClose}
            aria-label="Close login dialog"
            type="button"
          >
            ✕
          </button>
        )}
        {children}
      </div>
    </div>
  ) : null;
}
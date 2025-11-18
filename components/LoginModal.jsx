import { useEffect } from 'react';
import Modal from './Modal.component';
import LogInOptions from './LogInOptions';
import { useAuth } from '../contexts/AuthContext';
import styles from './login-modal.module.css';

export default function LoginModal({ open, onClose }) {
  const { user } = useAuth();

  // Auto-close when user becomes available (successful login or existing session)
  useEffect(() => {
    if (open && user) {
      try { onClose?.(); } catch {}
    }
  }, [user, open, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      hideClose
      ariaLabel="Login"
      contentClassName={styles.loginModalContent}
    >
      <div className={styles.loginModalWrapper}>
        {/* <h2 id="login-modal-title" className={styles.loginModalHeader}>Welcome</h2>
        <p id="login-modal-desc" className={styles.loginModalNote}>Sign in or create an account</p> */}
        <LogInOptions />
      </div>
    </Modal>
  );
}

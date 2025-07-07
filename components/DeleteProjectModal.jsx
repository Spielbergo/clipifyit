import styles from  './modal.module.css'

export default function DeleteProjectModal({ open, onCancel, onConfirm, projectName }) {
  if (!open) return null;
  return (
    <div className={styles.modal_overlay}>
      <div className="modal-content" style={{
        background: '#111', borderRadius: 8, padding: 32, minWidth: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
      }}>
        <h3 style={{ marginBottom: 16 }}>Delete Project</h3>
        <p>Are you sure you want to delete <b>{projectName}</b>?</p>
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 4, border: 'none', background: '#ccc', color: '#222' }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '8px 16px', borderRadius: 4, border: 'none', background: '#c00', color: '#fff' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}
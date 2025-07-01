export default function DeleteProjectModal({ open, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <p>Are you sure you want to delete this project?</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onCancel}>Cancel</button>
          <button onClick={onConfirm} style={{ background: '#c00', color: '#fff' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}
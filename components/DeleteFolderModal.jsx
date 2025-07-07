import React from 'react';

export default function DeleteFolderModal({ open, onCancel, onConfirm, folderName }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="modal-content" style={{
        background: '#111', borderRadius: 8, padding: 32, minWidth: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
      }}>
        <h3 style={{ marginBottom: 16 }}>Delete Folder</h3>
        <p>Are you sure you want to delete <b>{folderName}</b>?</p>
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 4, border: 'none', background: '#ccc', color: '#222' }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '8px 16px', borderRadius: 4, border: 'none', background: '#c00', color: '#fff' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}
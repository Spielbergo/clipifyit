import React from 'react';
import { supabase } from '../lib/supabase';

export default function LogoutButton({ onAfterLogout, style = {}, children }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (onAfterLogout) onAfterLogout();
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        display: 'block',
        width: '100%',
        padding: '12px 20px',
        background: 'none',
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        color: '#d32f2f',
        fontSize: 15,
        ...style,
      }}
    >
      {children || 'Logout'}
    </button>
  );
}
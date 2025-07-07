import React from 'react';

export default function SearchBar({ value, onChange, onClear }) {
  return (
    <div style={{ position: 'relative', margin: '0 0 12px 0', padding: '0 13px' }}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search projects..."
        style={{
          width: '100%',
          padding: '8px 36px 8px 12px',
          color: '#eee',
          borderRadius: '20px',
          border: '1px solid #666',
          outline: 'none',
          fontSize: '15px',
          background: '#333',
          boxSizing: 'border-box'
        }}
      />
      <span style={{
        position: 'absolute',
        right: 26,
        top: '55%',
        transform: 'translateY(-50%)',
        color: '#888',
        cursor: value ? 'pointer' : 'default',
        userSelect: 'none'
      }}>
        {value ? (
          // X (clear) icon
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            onClick={onClear}
            style={{ cursor: 'pointer' }}
          >
            <circle cx="10" cy="10" r="9" stroke="#888" strokeWidth="2" fill="#222"/>
            <line x1="7" y1="7" x2="13" y2="13" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
            <line x1="13" y1="7" x2="7" y2="13" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          // Search icon
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="7" stroke="#888" strokeWidth="2"/>
            <line x1="14.2" y1="14.2" x2="18" y2="18" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}
      </span>
    </div>
  );
}
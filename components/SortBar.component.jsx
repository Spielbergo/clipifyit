import React from 'react';

export default function SortBar({ sortMode, setSortMode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '0 8px', margin: '0 0 8px 0' }}>
      <button
        style={{ fontWeight: sortMode === 'alpha' || sortMode === 'descAlpha' ? 700 : 400 }}
        onClick={() => setSortMode(sortMode === 'alpha' ? 'descAlpha' : 'alpha')}
        title={sortMode === 'alpha' ? "Sort Z-A" : "Sort A-Z"}
      >
        {sortMode === 'alpha' ? 'A-Z' : 'Z-A'}
      </button>
      <button
        style={{ fontWeight: sortMode === 'oldest' ? 700 : 400 }}
        onClick={() => setSortMode('oldest')}
        title="Sort by oldest"
      >Oldest</button>
      <button
        style={{ fontWeight: sortMode === 'latest' ? 700 : 400 }}
        onClick={() => setSortMode('latest')}
        title="Sort by latest"
      >Latest</button>
    </div>
  );
}
import React from 'react';
import styles from './sort-bar.module.css';

export default function SortBar({ sortMode, setSortMode }) {
  return (
    <div className={styles.sortBar}>
      <button
        className={`${styles.sortButton} ${(sortMode === 'alpha' || sortMode === 'descAlpha') ? styles.sortButtonActive : ''}`}
        onClick={() => setSortMode(sortMode === 'alpha' ? 'descAlpha' : 'alpha')}
        title={sortMode === 'alpha' ? 'Sort Z-A' : 'Sort A-Z'}
      >
        {sortMode === 'alpha' ? 'A-Z' : 'Z-A'}
      </button>
      <button
        className={`${styles.sortButton} ${sortMode === 'oldest' ? styles.sortButtonActive : ''}`}
        onClick={() => setSortMode('oldest')}
        title="Sort by oldest"
      >Oldest</button>
      <button
        className={`${styles.sortButton} ${sortMode === 'latest' ? styles.sortButtonActive : ''}`}
        onClick={() => setSortMode('latest')}
        title="Sort by latest"
      >Latest</button>
    </div>
  );
}
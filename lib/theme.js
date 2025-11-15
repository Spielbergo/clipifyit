// Centralized theme management for the app
// - Sets document.documentElement data-theme attribute
// - Persists user choice in localStorage
// - Temporarily toggles legacy .dark-mode class for back-compat

const THEME_STORAGE_KEY = 'theme'; // values: 'light' | 'dark' | (future: 'system' | custom)

export function detectSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme, { persist = true } = {}) {
  if (typeof document === 'undefined') return theme;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  // Back-compat with existing CSS rules. TODO: remove once all .dark-mode styles are migrated.
//   document.body && document.body.classList.toggle('dark-mode', theme === 'dark');
  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
  }
  return theme;
}

export function getStoredTheme() {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function initTheme() {
  const stored = getStoredTheme();
  const theme = stored || detectSystemTheme();
  return applyTheme(theme, { persist: !stored });
}

export function toggleTheme(current) {
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

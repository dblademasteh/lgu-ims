import { create } from 'zustand';

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light';
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

function initialTheme() {
  try {
    const stored = localStorage.getItem('lgu-theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  return getSystemTheme();
}

export const useThemeStore = create((set) => ({
  theme: typeof window !== 'undefined' ? initialTheme() : 'light',
  setTheme: (theme) => {
    const next = theme === 'dark' ? 'dark' : 'light';
    try { localStorage.setItem('lgu-theme', next); } catch {}
    set({ theme: next });
  },
}));

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

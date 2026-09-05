import { create } from 'zustand';

export const THEMES = [
  { id: 'light', label: 'Light', family: 'light', swatch: '#fdfbf4', chrome: '#f4f0e6' },
  { id: 'forest', label: 'Forest', family: 'light', swatch: '#177a44', chrome: '#edf3e7' },
  { id: 'dark', label: 'Printer Room', family: 'dark', swatch: '#20232a', chrome: '#17191f' },
  { id: 'steel', label: 'Steel', family: 'dark', swatch: '#5b8bef', chrome: '#181b21' },
];

const IDS = new Set(THEMES.map((t) => t.id));

function initialTheme() {
  try {
    const stored = localStorage.getItem('lgu-theme');
    if (stored && IDS.has(stored)) return stored;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {
    /* ignore */
  }
  return 'light';
}

export const useThemeStore = create((set) => ({
  theme: typeof window !== 'undefined' ? initialTheme() : 'light',
  setTheme: (theme) => {
    const next = IDS.has(theme) ? theme : 'light';
    try {
      localStorage.setItem('lgu-theme', next);
    } catch {}
    set({ theme: next });
  },
}));

export function applyTheme(theme) {
  const t = THEMES.find((x) => x.id === theme) || THEMES[0];
  document.documentElement.dataset.theme = t.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.chrome);
}
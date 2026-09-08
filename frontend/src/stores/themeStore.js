import { create } from 'zustand';

export const SCALE_MIN = 12;
export const SCALE_MAX = 16;
export const SCALE_DEFAULT = 14;

export const FONT_OPTIONS = [
  { key: 'default', label: 'Inter', desc: 'Modern sans (default)', body: null, heading: null },
  {
    key: 'system', label: 'System', desc: 'Native device fonts',
    body: `-apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`, heading: null,
  },
  {
    key: 'serif', label: 'Serif', desc: 'Formal government serif',
    body: `Georgia, 'Times New Roman', serif`, heading: `Georgia, 'Times New Roman', serif`,
  },
  {
    key: 'dm-sans', label: 'DM Sans', desc: 'Clean geometric sans',
    body: `'DM Sans', 'Inter', system-ui, sans-serif`, heading: `'DM Sans', 'Inter', system-ui, sans-serif`,
  },
];

// Preset accent pairs per theme. `default` clears overrides (falls back to CSS).
export const ACCENT_PRESETS = [
  { key: 'default', label: 'Government Blue', light: null, dark: null, swatch: '#1d4ed8' },
  { key: 'emerald', label: 'Emerald', light: ['#059669', '#047857'], dark: ['#34d399', '#6ee7b7'], swatch: '#059669' },
  { key: 'maroon', label: 'Maroon', light: ['#9f1239', '#881337'], dark: ['#fb7185', '#fda4af'], swatch: '#9f1239' },
  { key: 'violet', label: 'Violet', light: ['#6d28d9', '#5b21b6'], dark: ['#a78bfa', '#c4b5fd'], swatch: '#6d28d9' },
  { key: 'amber', label: 'Amber', light: ['#b45309', '#92400e'], dark: ['#fbbf24', '#fcd34d'], swatch: '#b45309' },
  { key: 'teal', label: 'Teal', light: ['#0f766e', '#115e59'], dark: ['#2dd4bf', '#5eead4'], swatch: '#0f766e' },
];

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light';
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

function stored(key, fallback, validate) {
  try {
    const v = localStorage.getItem(key);
    if (v != null && (!validate || validate(v))) return v;
  } catch {}
  return fallback;
}

function initialTheme() {
  const v = stored('lgu-theme', null, (x) => x === 'light' || x === 'dark');
  return v || getSystemTheme();
}

function initialScale() {
  const v = Number(stored('lgu-ui-scale', String(SCALE_DEFAULT)));
  return Number.isFinite(v) ? Math.min(SCALE_MAX, Math.max(SCALE_MIN, v)) : SCALE_DEFAULT;
}

function initialFont() {
  const v = stored('lgu-font', 'default');
  return FONT_OPTIONS.some((f) => f.key === v) ? v : 'default';
}

function initialAccent() {
  const v = stored('lgu-accent', 'default');
  if (v === 'default' || ACCENT_PRESETS.some((a) => a.key === v)) return v;
  if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  return 'default';
}

function persist(key, value) {
  try { localStorage.setItem(key, String(value)); } catch {}
}

// Darken (pct<0) or lighten (pct>0) a #rrggbb color for hover states.
export function shade(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * pct);
  const cl = (v) => Math.min(255, Math.max(0, v + amt));
  const r = cl(n >> 16), g = cl((n >> 8) & 0xff), b = cl(n & 0xff);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export const useThemeStore = create((set) => ({
  theme: typeof window !== 'undefined' ? initialTheme() : 'light',
  uiScale: typeof window !== 'undefined' ? initialScale() : SCALE_DEFAULT,
  font: typeof window !== 'undefined' ? initialFont() : 'default',
  accent: typeof window !== 'undefined' ? initialAccent() : 'default',
  setTheme: (theme) => {
    const next = theme === 'dark' ? 'dark' : 'light';
    persist('lgu-theme', next);
    set({ theme: next });
  },
  setUiScale: (scale) => {
    const next = Math.min(SCALE_MAX, Math.max(SCALE_MIN, Number(scale) || SCALE_DEFAULT));
    persist('lgu-ui-scale', next);
    set({ uiScale: next });
  },
  setFont: (font) => {
    const next = FONT_OPTIONS.some((f) => f.key === font) ? font : 'default';
    persist('lgu-font', next);
    set({ font: next });
  },
  setAccent: (accent) => {
    const next = accent === 'default' || ACCENT_PRESETS.some((a) => a.key === accent) || /^#[0-9a-f]{6}$/i.test(accent || '')
      ? accent
      : 'default';
    persist('lgu-accent', next);
    set({ accent: next });
  },
  resetAppearance: () => {
    persist('lgu-ui-scale', SCALE_DEFAULT);
    persist('lgu-font', 'default');
    persist('lgu-accent', 'default');
    set({ uiScale: SCALE_DEFAULT, font: 'default', accent: 'default' });
  },
}));

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

// Applies the full appearance (theme + scale + font + accent) to <html>.
// Called once at boot and on every store change (see main.jsx).
export function applyAppearance(s) {
  const root = document.documentElement;
  const theme = s.theme === 'dark' ? 'dark' : 'light';
  root.dataset.theme = theme;
  root.style.fontSize = `${s.uiScale || SCALE_DEFAULT}px`;

  const font = FONT_OPTIONS.find((f) => f.key === s.font) || FONT_OPTIONS[0];
  if (font.body) root.style.setProperty('--font-body', font.body);
  else root.style.removeProperty('--font-body');
  if (font.heading) root.style.setProperty('--font-heading', font.heading);
  else root.style.removeProperty('--font-heading');

  const preset = ACCENT_PRESETS.find((a) => a.key === s.accent);
  const pair = preset ? preset[theme] : null;
  if (pair) {
    root.style.setProperty('--accent', pair[0]);
    root.style.setProperty('--accent-hover', pair[1]);
  } else if (typeof s.accent === 'string' && /^#[0-9a-f]{6}$/i.test(s.accent)) {
    root.style.setProperty('--accent', s.accent);
    root.style.setProperty('--accent-hover', shade(s.accent, -14));
  } else {
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-hover');
  }
}

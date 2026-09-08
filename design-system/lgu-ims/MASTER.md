# Design System: LGU IMS

> **v1.0** · Last reviewed 2026-09 · Owner: Design
> This document is a living contract, not a fossil. Bump the version and date on any change to tokens, components, or surfaces.

## 0. How to Use This Document
- **Hard constraints** (must never be violated): accessibility minimums (§9), token-only color usage (§2), no hardcoded hex.
- **Defaults** (should be followed, may be overridden with justification recorded in the PR description): layout numbers, component patterns, motion timings.
- **Adding something new?** See §11 before inventing a one-off pattern.

## 1. Visual Thesis
A "quiet productivity" government interface. Cool slate surfaces, hairline borders, one authoritative blue accent for primary actions and active state, data-first tables with no vertical rules, and mono uppercase machine labels for metadata. No decorative motion, no entrance choreography. Adapted for government inventory: transparent, accountable, and calm.

**Anti-patterns** — things this system deliberately avoids:
- Vertical rules in tables (creates a "spreadsheet" feel, not a "document" feel). Exception: financial reconciliation views where column alignment is safety-critical may use them — note the exception inline in code.
- Animation on page load or route change.
- Gray-tinted badges/alerts/fills — tints always derive from the role color via `color-mix`.
- Raw hex anywhere outside `frontend/src/index.css`.
- Decorative icons that don't aid comprehension (identity, action, status, empty state, or nav only).

## 2. Color Palette (Semantic & Muted)
Raw hex lives only in `frontend/src/index.css` as CSS custom properties; components reference semantic tokens only, either as CSS variables (`var(--accent)`) or Tailwind theme mappings (`bg-surface`, `text-muted`, `border-border`, `text-accent`, …) that are extended from those same variables in `tailwind.config`. **`index.css` is the single source of truth** — `tailwind.config` only maps names to it, never redefines a value.

Two themes via `data-theme` on `<html>` — `light` (cool professional slate, default) and `dark` (deep navy) — persisted in `localStorage['lgu-theme']`; the initial value follows the OS `prefers-color-scheme`.

| Token | Light | Dark | Usage |
| :--- | :--- | :--- | :--- |
| `--bg` | `#f4f6fb` | `#0b1120` | Page background |
| `--surface` | `#ffffff` | `#111a2e` | Cards, panels, modals |
| `--surface-alt` | `#eef1f7` | `#1a2438` | Subtle backgrounds, table headers |
| `--border` | `#e2e8f0` | `#26334d` | Hairline dividers, input borders |
| `--border-strong` | `#cbd5e1` | `#334155` | Stronger rules, scrollbars |
| `--text` | `#0f172a` | `#f1f5f9` | Primary text |
| `--muted` | `#475569` | `#94a3b8` | Captions, labels, placeholder |
| `--faint` | `#94a3b8` | `#64748b` | Disabled, meta, footers |
| `--accent` | `#1d4ed8` | `#60a5fa` | Primary actions, active state |
| `--accent-hover` | `#1e40af` | `#93c5fd` | Accent hover |
| `--success` | `#059669` | `#34d399` | Success |
| `--warning` | `#d97706` | `#fbbf24` | Warning |
| `--error` | `#dc2626` | `#f87171` | Errors, critical |

Tinted fills (badges, alerts, icon tiles) use `color-mix(in oklab, <role> 8–15%, transparent)` so they tint the role color, never gray.

### Theme Compatibility — Hard Requirement
Every component must render correctly in **both** themes. A component that looks right in one and wrong in the other is a bug, not a nicety.
- **No hardcoded colors, ever.** All color comes from CSS variables or their Tailwind mappings.
- **No light-only or dark-only values.** Verify both themes before considering a component done — this belongs in PR review, not just design QA.
- **Tinted fills and shadows adapt automatically** via `color-mix` and the per-theme shadow scale below — never a fixed gray shadow or fixed-opacity fill.

## 3. Typography (Clean & Functional)
- **Body**: `Inter` (400–700), `ui-sans-serif, system-ui, -apple-system, sans-serif`.
- **Headings**: `Sora` (500–800), `tracking-tight` at `-0.01em` to `-0.03em`, weights 700–800.
- **Data/Mono**: `JetBrains Mono` (400–600), `ui-monospace, 'Courier New', monospace`.
- **Scale**:
  - `h1`: 1.5rem / 700 / Tracking-tight
  - `h2`: 1.125rem / 700
  - `body`: 0.9375–1rem / Regular / Leading 1.6
  - `caption`/labels: 0.5625–0.75rem / Mono / Uppercase / Tracking 0.06–0.14em
- Tabular numerals in `.mono`, `.table`, `.stat-value`, `.kpi-value`, `.items-stock-cell`, and money/ledger figures.

## 4. Layout, Spacing & Breakpoints
- **Containers**: `.page-inner` max-width 1400px, centered, 1.75rem padding.
- **Borders**: 1px `--border` hairlines; 1.5px for emphasis (modals, settings cards). No heavy borders.
- **Radius**: 14px cards/stat/KPI, 12px modals/tabs-box, 10px buttons/inputs, 8px alerts/rows.
- **Spacing**: 8px base grid. `gap-4` (16px) for standard components; `gap-8` (32px) for section spacing.
- **Shadows**: `sm` `0 1px 2px`, `md` `0 4px 14px`, `lg` `0 16px 40px`; ink-tinted at 5–14% opacity in light, 40–55% black in dark. `shadow-sm` on resting cards, `shadow-md` on hover, `shadow-lg` only for floating elements (modals/dropdowns).

### Breakpoints
Tailwind defaults, used as-is — no custom breakpoints defined:

| Alias | Width | Applies to |
| :--- | :--- | :--- |
| (base) | <640px | Single-column stacks; KPI/dashboard grids collapse to 1 col; tables scroll horizontally within a bordered wrapper rather than reflowing |
| `sm` | ≥640px | KPI grid → 2 col |
| `md` | ≥768px | Login split-shell collapses to single column (form panel only, brand panel hidden) |
| `lg` | ≥1024px | Drawer sidebar pins open (`lg:drawer-open`); KPI grid → full column count; dashboard charts grid goes 2-up |
| `xl` | ≥1280px | `.page-inner` reaches its 1400px practical max with side padding |

## 5. Signature Elements
- **The Gradient Primary Button**: `btn-primary` is a blue gradient (`accent → accent-hover`) with white text and a colored glow — the single most prominent action on any surface.
- **The Hairline Divider**: horizontal hairline rules separate content, creating a "document" feel rather than a "widget" feel.
- **Data-First Tables**: sticky mono uppercase headers, no vertical borders, row hover is a subtle accent tint (5%).
- **The Mono Machine Label**: JetBrains Mono uppercase letterspaced labels for table headers, badges, form legends, sidebar sections, footers, SKUs, and ledger figures.
- **The Official Form Modal**: `FormModal` (full spec in §6 under *Overlays*) — 4px tone accent bar, seal/emblem icon tile, title with optional mono "Form No." caption, optional status badge.

## 6. Components

### Inputs & Actions
- **btn** — Inter 600, hairline-outlined on surface with `shadow-sm`; `btn-primary` gradient; ghost/outline/error/success/info variants; sizes sm/xs/lg, circle, square; hover 150ms + `shadow-md`, active `translateY(1px)`, disabled 45%.
- **input / select / textarea / checkbox** — surface fill, hairline border, radius 10px; focus = accent border + 3px accent ring; checkbox fills accent when checked; `.fieldset-legend` labels.

### Data Display
- **table** — sticky thead in mono uppercase tracked small caps on `surface-alt`; `border-bottom` row rules; hover accent 5% tint; `.table-zebra`; `.table-sm`.
- **badge** — mono uppercase pills; tinted fills per state; `badge-primary` ink fill; `badge-ghost`/`badge-outline` neutral.
- **card** — surface + hairline + `shadow-sm`, radius 14px; `.card-title` Sora 700.
- **stat** — surface + hairline + `shadow-sm`, radius 14px; `.stat-title` mono uppercase, `.stat-value` 1.75rem 800 tabular.
- **avatar** — circle initials tile, sizes sm/lg.

### Overlays
- **modal** — portal + `<dialog>` hybrid; `.modal-backdrop` (ink 48%, `z-index: modal-backdrop` — see §8) centers `.modal-box` (radius 12px, `shadow-lg`); sizes sm/md/lg/xl/2xl/full (20–80rem); variants form/confirm/QR/scan/alert.
- **FormModal** — the modal variant used for all data-entry forms: 4px tone accent bar along the top edge, seal/emblem icon tile (see §7 logo usage), title with optional mono "Form No." caption, optional status badge.
- **drawer** — React-controlled side panel, 200ms ease; `lg:drawer-open` pins on ≥1024px; collapsible to 4.5rem.
- **dropdown** — opens on `:focus-within`; end-aligned, `shadow-lg`.

### Navigation
- **tabs / tabs-box / tab** — boxed segmented control; active = surface fill + accent text + `shadow-sm`.
- **join** — merged segmented controls (pagination, search).
- **pagination** — record count + prev/next + page buttons; current = `btn-active`.

### Feedback & State
- **alert** — state-tinted fills (8% role color) with role-colored border + text; inline and toast bodies.
- **divider** — mono uppercase label between hairline rules.
- **loading** — `loading-spinner` ring (700ms linear), sizes xs–lg; `progress` 8px role-colored bars.
- **skeleton** — surface-alt blocks at the same radius as the content they replace, subtle opacity pulse (1.5s ease-in-out, respects `prefers-reduced-motion`); used for initial table rows, KPI cards, and chart cards while data loads. Never used for interactions the user initiated (button clicks use `loading-spinner` inline instead).
- **empty state** — centered in the content area: a `lucide-react` icon at the nav size (see icon scale below) in `--faint`, a mono uppercase caption describing the empty condition (e.g. "NO ITEMS FOUND"), and an optional primary or ghost button as the resolving action. Used for empty tables, zero-result filters, and empty dashboards.

### Domain-Specific
- **item panel** — right slide-over (22rem) with backdrop, image header + upload, stock gauge, mono field labels, ledger entries.
- **items table** — search input with leading icon, filter selects, low-stock toggle, thumbnails, sortable headers.
- **dashboard** — KPI cards, chart cards (recharts), alert rows, budget cards.
- **settings (sp-*)** — horizontal tab bar with accent underline, cards, toolbar search, tree/table toggle, toggle switches, status badges, API-key banner, QR/secret reveal.
- **print** — `.print-area` isolates printable content; `.no-print` hides chrome.

### Icons
`lucide-react`, inherit `currentColor` so they adapt to both themes automatically. Verify icon names against the installed version before import — an invalid name breaks the build with `[MISSING_EXPORT]`.

| Size | Usage |
| :--- | :--- |
| 14px | Inline with body/caption text (e.g. inside a badge or table cell) |
| 16px | Inside buttons, inputs (leading icons), inline actions |
| 20px | Nav items, topbar actions, empty-state secondary use |
| 32px+ | Empty-state primary icon, brand/icon tiles |

## 7. Application Surfaces
- **Login** — full-viewport `.gov-login`: deep-navy gradient + radial glows + 48px grid overlay; split shell (1.05fr/1fr, `max-w-62rem`, radius 20px, collapses to single column below `md`): brand panel (seal, "Republic of the Philippines", title, subtitle, divider, description, four feature rows, mono foot) + form panel (welcome header, username/password with leading icons, show-password toggle, error alert, gradient primary button, forgot-password link, demo-account grid behind `VITE_SHOW_DEMO_ACCOUNTS`). Multi-step: credentials → 2FA → forced password change. Forgot-password modal (`.gov-modal` with accent top bar, icon, numbered steps).
- **App shell** — `.drawer` with sidebar: brand (gradient icon + name + mono sub), grouped nav (Operations / Oversight / Administration) with icons, active = accent tint + 3px left marker, unread notification badge; topbar: mobile hamburger, collapse toggle, breadcrumb (`LGU IMS / current`), theme toggle, notifications bell with badge, avatar dropdown (user info, change password, audit links, sign out, sign out all); footer as mono uppercase manifest line.
- **Dashboard** — greeting + date, KPI grid, charts grid, alerts grid, budget cards, recent ledger. Loading state uses `skeleton` per §6; zero-data state uses `empty state` per §6.
- **Detail pages** — `PageHeader` (title + subtitle + actions), card + table, tabs, portal modals, print areas.

### Logo & Seal Usage
- Minimum display size: 32px (matches the icon-tile size in FormModal and sidebar brand mark).
- Clear space: at least 25% of the seal's width on all sides — never crop or crowd it against a border.
- The seal asset is identical across themes; it does not invert. Give it a `surface`-colored tile background in both themes so it never sits directly on `bg`.

### Modal Persistence
ALL modals persist until explicitly closed or cancelled — never dismiss on backdrop click. Close only via the `X` button, a **Cancel** button, or completing the action. The `onClick={(e) => { if (e.target === e.currentTarget) ... }}` handler is removed from every `.modal-backdrop`. Escape key is a deliberate user action (acceptable) but backdrop click is not. The mobile drawer overlay (navigation chrome) is intentionally left as-is.

### HMR / Dev-Environment Pre-Check
Before reporting a UI bug, always verify it reproduces after a clean Vite HMR cycle: press `Ctrl+Shift+P` → **"Reload Window"** (or hit `F5` in the browser), then confirm the issue on both `light` and `dark` themes. Stale HMR state can mask CSS variable updates, leave detached portal nodes in the DOM, or serve a cached module where the backdrop-click handler still exists. If the bug disappears after hard-refresh, it was HMR staleness — do not treat it as a regression. Clear the browser's Vite overlay cache (disable/re-enable the extension or `rm -rf node_modules/.vite` in `frontend/`) if the stale state persists across reloads.

## 8. Motion & Z-Index

### Motion & Opacity Tokens
State transitions only — 60–200ms range. No page-load sequences, no decoration-only animation. `prefers-reduced-motion` zeroes all animation/transition durations everywhere in this table.

| Token | Value | Usage |
| :--- | :--- | :--- |
| `--duration-hover` | 150ms | Button, row, and link hover |
| `--duration-panel` | 200ms | Drawer, dropdown, tab switch |
| `--duration-modal` | 200ms | Modal open/close |
| `--duration-gauge` | 400ms | Stock gauge fill animation |
| `--duration-pulse` | 1500ms | Skeleton loading pulse |
| `--opacity-disabled` | 45% | Disabled buttons/inputs |
| `--opacity-tint` | 5% | Table row hover tint |
| `--opacity-fill` | 8–15% | Badge/alert/icon-tile tinted fills |
| `--opacity-backdrop` | 48% | Modal/drawer backdrop (ink) |

### Z-Index Scale
Lowest to highest — every overlay uses one of these named layers rather than an arbitrary number:

| Layer | z-index | Used by |
| :--- | :--- | :--- |
| `sticky` | 20 | Sticky table headers, topbar |
| `drawer` | 40 | Sidebar drawer panel |
| `dropdown` | 60 | Dropdown menus |
| `modal-backdrop` | 90 | Modal/panel backdrop |
| `modal` | 100 | Modal/panel content |
| `toast` | 120 | Toast notifications (always above modals) |

## 9. Accessibility
Contrast: ink on surface ≥ 7:1 in light theme; dark theme's higher-luminance-on-navy combination measures ≥ 12:1 by default under this palette, but 7:1 (WCAG AAA) is the actual minimum requirement in both themes — the dark figure is an observed outcome of the token values above, not a separately imposed target. Muted tints ≥ 4.5:1 foreground on ground.

Visible `:focus-visible` = 2px accent outline offset 2px; accent caret and selection. Touch targets ≥ 2.75rem buttons, controls ≥ 44px on touch. Keyboard: drawer via button, dropdown via focus-within, modals focusable with backdrop/Esc close. Every icon button carries `aria-label`.

**Verification checklist per component:**
- [ ] Contrast checked in both themes
- [ ] Focus-visible ring present and 2px accent
- [ ] Reachable and operable via keyboard alone
- [ ] Icon-only controls have `aria-label`
- [ ] Motion respects `prefers-reduced-motion`

## 10. Provenance
PWA raster icons (`public/icons/*.png`: icon-180/192/512 + icon-maskable-512) referenced by `manifest.webmanifest` (`theme_color #ffffff`); service worker `public/sw.js`. Fonts (Inter, Sora, JetBrains Mono) loaded from Google Fonts. Icons from `lucide-react`.

## 11. Extending the System
Before building a new component not listed in §6:
1. **Check §6 first** — a close variant (e.g. a new badge state, a new alert role) usually needs a new tinted-fill role, not a new pattern.
2. **Derive, don't invent**: radius from the §4 scale, border from `--border`/`--border-strong`, shadow from the three-step scale, spacing from the 8px grid.
3. **Tokenize color only** — no raw hex, ever, even "just for this one component."
4. **Verify both themes** before calling it done (§2, §9 checklist).
5. **Pick an icon size from the §6 scale** if the component uses one.
6. **Assign a z-index layer from §8** if it overlays other content — never an arbitrary number.
7. **Add it to §6** under the right grouping (Inputs, Data Display, Overlays, Navigation, Feedback & State, or Domain-Specific) so the next person doesn't have to guess.
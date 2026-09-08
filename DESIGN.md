# Design System — LGU Inventory Management System

<!-- impeccable:design-schema 1 -->

Recorded from the built world (frontend, React 19 + Vite + Tailwind 4). Own UI; no component library. Two themes via `data-theme` on `<html>` — `light` (cool professional slate, default) and `dark` (deep navy) — switchable from the topbar theme picker and persisted in `localStorage['lgu-theme']`; the initial value follows the OS `prefers-color-scheme`. Every component must render correctly in **both** themes — theme compatibility is a hard requirement, not a nicety.

## Visual world

A "quiet productivity" government interface. Cool slate surfaces, hairline borders, one authoritative blue accent for primary actions and active state, data-first tables with no vertical rules, and mono uppercase machine labels for metadata. No decorative motion, no entrance choreography.

## Palette

CSS variables defined in `frontend/src/index.css`. Own UI component class system (no library). Semantic tokens map to Tailwind v4 theme colors (`bg`, `surface`, `surface-alt`, `border`, `border-strong`, `text`, `muted`, `faint`, `accent`, `accent-hover`, `success`, `warning`, `error`).

| Role | Light (slate) | Dark (navy) |
|---|---|---|
| page bg (`--bg`) | `#f4f6fb` | `#0b1120` |
| surface (`--surface`) | `#ffffff` | `#111a2e` |
| surface-alt (`--surface-alt`) | `#eef1f7` | `#1a2438` |
| hairline (`--border`) | `#e2e8f0` | `#26334d` |
| strong border (`--border-strong`) | `#cbd5e1` | `#334155` |
| ink (`--text`) | `#0f172a` | `#f1f5f9` |
| muted (`--muted`) | `#475569` | `#94a3b8` |
| faint (`--faint`) | `#94a3b8` | `#64748b` |
| accent (`--accent`) | `#1d4ed8` | `#60a5fa` |
| accent-hover (`--accent-hover`) | `#1e40af` | `#93c5fd` |
| success / warning / error | `#059669` / `#d97706` / `#dc2626` | `#34d399` / `#fbbf24` / `#f87171` |

Shadows: `sm` `0 1px 2px`, `md` `0 4px 14px`, `lg` `0 16px 40px`; ink-tinted at 5–14% opacity in light, 40–55% black in dark. Tinted fills (badges, alerts, icon tiles) use `color-mix(in oklab, <role> 8–15%, transparent)` so they tint the role color, never gray.

## Theme compatibility (light & dark)

Every component must render correctly in **both** themes — this is a hard requirement, not a nicety. The app ships exactly two themes (`light` slate, `dark` navy) toggled via `data-theme` on `<html>`.

- **No hardcoded colors.** All color comes from CSS variables (`--surface`, `--text`, `--accent`, …) or their Tailwind theme mappings (`bg-surface`, `text-muted`, `border-border`, `text-accent`, …). Never write a raw hex in a component.
- **No light-only or dark-only values.** A component that looks right in one theme but wrong in the other is a bug. Verify both themes before considering a component done.
- **Tinted fills adapt automatically.** Badges, alerts, icon tiles, and active states use `color-mix(in oklab, var(--role) 8–15%, transparent)` so they tint the role color in both themes, never gray.
- **Shadows are per-theme.** Ink-tinted at 5–14% opacity in light, 40–55% black in dark — never a fixed gray shadow.
- **Icons.** Use `lucide-react` icons wherever they aid comprehension — identity fields, actions, statuses, empty states, nav. Icons inherit `currentColor` and adapt to both themes automatically. Verify icon names against the installed version before import (an invalid name breaks the build with `[MISSING_EXPORT]`).

## Type

- Inter (400–700) — UI/body; fixed rem scale (`--text-xs` 0.75 → `--text-xl` 1.5rem), `line-height 1.6`.
- Sora (500–800) — headings (`h1`–`h3`, `.card-title`); `tracking-tight` at `-0.01em` to `-0.03em`, weights 700–800.
- JetBrains Mono (400–600) — machine labels: table headers, badges, form legends, sidebar section labels, footers, SKUs, ledger figures. Uppercase, letterspaced (`0.06em`–`0.14em`), size 0.5625–0.75rem.
- Tabular numerals in `.mono`, `.table`, `.stat-value`, `.kpi-value`, `.items-stock-cell`, and money/ledger figures.

## Components (all theme-aware, no hardcoded colors)

- **btn** — Inter 600, hairline-outlined on surface with `shadow-sm`; `btn-primary` = blue gradient fill (`accent → accent-hover`) with white text and a colored glow; ghost/outline/error/success/info variants; sizes sm/xs/lg, circle, square; hover 150ms + `shadow-md`, active `translateY(1px)`, disabled at 45%.
- **input / select / textarea / checkbox** — surface fill, hairline border, radius 10px; focus = accent border + 3px accent ring (`color-mix` 18%); checkbox fills accent when checked; `.fieldset-legend` labels; `.select` draws its own chevron.
- **table** — sticky thead in mono uppercase tracked small caps on `surface-alt`; `border-bottom` row rules; hover tints the row with accent at 5%; `.table-zebra` alternates `surface-alt`; `.table-sm` compact.
- **badge** — mono uppercase pills; tinted fills per state (info/success/warning/error), `badge-primary` ink fill, `badge-ghost`/`badge-outline` neutral.
- **alert** — state-tinted fills (8% role color) with role-colored border + text; used inline and as toast bodies.
- **card** — surface + hairline + `shadow-sm`, radius 14px; `.card-title` Sora 700.
- **stat** — surface + hairline + `shadow-sm`, radius 14px; `.stat-title` mono uppercase, `.stat-value` 1.75rem 800 tabular.
- **modal** — portal + `<dialog>` hybrid. `.modal-backdrop` (fixed, ink at 48%, z-90) centers `.modal-box` (surface, 1.5px hairline, radius 12px, `shadow-lg`). Sizes sm/md/lg/xl/2xl/full (20–80rem) — the size class goes on the **same element** as `.modal-box` (`className="modal-box modal-lg"`), and the CSS targets `.modal-box.modal-lg` (NOT a descendant selector — a `.modal-lg .modal-box` rule silently never matches and the modal falls back to content width). Header/body/footer; variants: form (2-col `.modal-form-grid`), confirm (role icon circle), QR, scan, alert. `FormModal` adds a 4px tone accent bar, a seal/emblem icon tile, a title with optional mono "Form No." caption, and an optional status badge.
- **drawer** — React-controlled side panel, 200ms ease; `lg:drawer-open` pins it as a sticky column on ≥1024px; collapsible to 4.5rem (persisted `lgu_sidebar_collapsed`).
- **dropdown** — opens on `:focus-within`; end-aligned, `shadow-lg`.
- **tabs / tabs-box / tab** — boxed segmented control; active tab = surface fill + accent text + `shadow-sm`.
- **divider** — mono uppercase label between hairline rules.
- **join** — merged segmented controls (pagination, search).
- **loading** — `loading-spinner` ring (700ms linear), sizes xs–lg; `progress` 8px role-colored bars.
- **avatar** — circle initials tile, sizes sm/lg.
- **pagination** — record count + prev/next + page buttons; current page = `btn-active`.
- **item panel** — right slide-over (22rem) with backdrop, image header + upload, stock gauge, mono field labels, ledger entries.
- **items table** — search input with leading icon, filter selects, low-stock toggle, thumbnails, sortable headers.
- **dashboard** — KPI cards (icon tile + value + label, hover lift), chart cards (recharts), alert rows (low stock / expiry), budget cards (name + pct + progress + amount).
- **settings (sp-*)** — horizontal tab bar with accent underline, cards, toolbar search, tree/table toggle, toggle switches, status badges, API-key banner, QR/secret reveal.
- **search / filter bar** — `.card.bg-surface.border-border` with `.card-body.py-3`; search input (absolute-positioned `lucide-react` `Search` icon at `left: 12px`, `top: 50%`, `transform: translateY(-50%)`, `color: var(--faint)`, input has `pl-9`; `.input.input-sm.w-full`) + `<select className="select select-sm" style={{ width: '10rem' }}>` for status/match filtering + checkbox for active-only toggle; wrapped in `flex flex-col sm:flex-row gap-3`; search input container uses `.relative.flex-1.md:max-w-md`; resets `page` to 1 on any change; uses `<EmptyState>` and `<Spinner>` for loading/empty states. **Standardized rules**: (1) always use the absolute-icon + `pl-9` pattern — never use inline SVG or `<label className="input">` wraps; (2) input element must have `type="search"` and `aria-label="Search <entity>"`, with `className="input input-sm w-full pl-9"`; (3) Search icon uses `size={16}` with inline `style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)' }}`; (4) clear button (×) is absolutely positioned at `right: 6px, top: 50%, transform: translateY(-50%)`; (5) placeholder text follows `Search <entity>…` — note the single ellipsis character `…`; (6) card always uses `bg-surface shadow-sm border-border` — never the non-theme `bg-base-100`; (7) all filter dropdowns use `select select-sm` with inline `style={{ width: '10rem' }}` (160px) — `select-sm` keeps them 40px tall so they align with the `input-sm` search input; do NOT rely on `md:w-40`/`md:w-44` classes (see pitfall below); (8) on mobile filters stack (`flex-col`), on `≥sm` they align (`sm:flex-row`).

  **Cascade-layer pitfall (why `pl-9` and `md:w-*` silently fail):** Tailwind v4 emits utilities inside a CSS `@layer`, and **unlayered author CSS always beats layered rules** regardless of source order. Two concrete consequences, both fixed in `frontend/src/index.css`:
  - `.input-sm { padding-inline: 0.75rem }` (unlayered) overrode the layered `pl-9`, leaving only 12px of left padding so the absolute-positioned Search icon (left:12px, 16px wide) bled into the placeholder text. Fix: an author rule `input.input-sm.pl-9 { padding-left: 2.3rem }` (specificity 0,2,1, unlayered) pins the gutter so the icon clears the text. Keep `pl-9` in the markup; the reinforcement lives in `index.css`.
  - `md:w-40` on filter `<select>`s was never emitted/effective, so selects auto-expanded to their widest option (e.g. "PARTIALLY ISSUED") plus chevron padding, ballooning to full row width and crushing the sibling search input. Fix: set the width inline (`style={{ width: '10rem' }}`) instead of relying on a responsive utility.

  **Dropdown sizing inventory (verified 2026-09-08, all rendered at their capped size):**

  *Category 1 — toolbar filter dropdowns* (always `select select-sm`, 40px tall to align with the `input-sm` search input; width inline-capped):

  | Page | Filter dropdown(s) | Width | Height | Search input |
  |---|---|---|---|---|
  | Audit Log | action | `10rem` (160px) | 40px | 40px |
  | Items | category, limit | `12rem` (192px), `6rem` (96px) | 40px | 40px |
  | Physical Count | status | `10rem` (160px) | 40px | — (no search, by design) |
  | Purchase Orders (list) | status | `10rem` (160px) | 40px | 40px |
  | Purchase Orders (3-Way Match tab) | status | `10rem` (160px) | 40px | — |
  | Receiving | status | `10rem` (160px) | 40px | 40px |
  | RIS | status | `10rem` (160px) | 40px | 40px |
  | Users | role, status | `10rem` (160px) ×2 | 40px | 40px |
  | Ledger | item selector | `flex-1`, bounded `min 12rem / max 22rem` (352px) | 48px | — |
  | Suppliers | none (search + Active-only checkbox) | — | — | 40px |

  *Category 2 — report parameter selects* (full-width form fields inside `ReportCard`s, sized to their card column — no capping): RSMI Department & Variance Department `180px` (3-col grid), Inventory Category / Movement Item / Ledger Item `565px` (full card column).

  *Category 3 — modal form selects* (sized by `.modal-form-grid` columns — full-span fields take the full width, half fields take half): PO (Dept 526 / Supplier 255 / Item 334), Receiving (Supplier 526 / PO 526 / Item 314), RIS (Dept 255 / Item 218), Users (Role 255 / Dept 255), Items (Category 250 / Condition 250), Physical Count (Dept 215 / Item 286), Budget (Dept 574).

  Rules that keep this table true: every toolbar filter `<select>` is `select select-sm` with an inline width style (never a responsive utility); report params and modal form selects intentionally fill their container (`.select` is `width:100%`); the only `.dropdown` component in the app is the topbar user-avatar menu (navigation chrome, not a filter).
- **logo / brand icon** — app shell sidebar uses a gradient icon tile (not a raster logo). Login page uses a government seal/emblem tile. These are decorative only — do not use raster PNG/SVG logo files or inline SVG search icons in component markup. All icons must be `lucide-react` components sized per context (14–16px), inheriting `currentColor` for theme adaptation. Always verify icon names against the installed version before import.
- **print** — `.print-area` isolates printable content; `.no-print` hides chrome.
- **icons** — `lucide-react`; inherit `currentColor` so they adapt to both themes; verify names against the installed version before import. Placeholder text for search inputs uses a single ellipsis character `…` (U+2026), not three separate dots `...`.

## Application surfaces

- **Login** — full-viewport `.gov-login`: deep-navy gradient with radial glows and a 48px grid overlay. Split shell (1.05fr/1fr, `max-w-62rem`, radius 20px): brand panel (seal tile, "Republic of the Philippines", title, subtitle, divider, description, four feature rows, mono foot) + form panel (welcome header, username/password with leading icons, show-password toggle, error alert, gradient primary button, forgot-password link, demo-account grid behind `VITE_SHOW_DEMO_ACCOUNTS`). Multi-step: credentials → 2FA code → forced password change. Forgot-password modal (`.gov-modal` with accent top bar, icon, numbered steps).
- **App shell** — `.drawer` with sidebar: brand (gradient icon + name + mono sub), grouped nav (Operations / Oversight / Administration) with icons, active = accent tint + 3px left marker, unread notification badge; topbar: mobile hamburger, collapse toggle, breadcrumb (`LGU IMS / current`), theme toggle, notifications bell with badge, avatar dropdown (user info, change password, audit links, sign out, sign out all); footer as mono uppercase manifest line.
- **Dashboard** — greeting + date, KPI grid, charts grid, alerts grid, budget cards, recent ledger.
- **Detail pages** — `PageHeader` (title + subtitle + actions), card + table, tabs, portal modals, print areas.

- **Modal persistence.** ALL modals persist until explicitly closed or cancelled — never dismiss on backdrop click. The `onClick={(e) => { if (e.target === e.currentTarget) ... }}` handler is removed from every `.modal-backdrop`. Close only via: the `X` button (`.modal-close`), a **Cancel** button, or completing the action. The mobile drawer overlay (navigation chrome) is intentionally left as-is.

## Motion

60–200ms state transitions only (hover 80–180ms, drawer 200ms, modal, panel gauge 400ms). No page-load sequences, no decoration-only animation. Reduced-motion respected globally.

## Accessibility

Contrast: ink on surface ≥ 7:1 light / ≥ 12:1 dark; muted tints ≥ 4.5:1 foreground on ground. Visible `:focus-visible` = 2px accent outline offset 2px; accent caret and selection. Touch targets ≥ 2.75rem buttons, controls ≥ 44px on touch. Keyboard: drawer via button, dropdown via focus-within, modals focusable with backdrop/Esc close. Every icon button carries `aria-label`.

## Provenance

PWA raster icons (`public/icons/*.png`: icon-180/192/512 + icon-maskable-512) referenced by `manifest.webmanifest` (`theme_color #ffffff`); service worker `public/sw.js`. Fonts (Inter, Sora, JetBrains Mono) loaded from Google Fonts. Icons from `lucide-react`.

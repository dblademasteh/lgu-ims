# Design System — LGU Inventory Management System

<!-- impeccable:design-schema 1 -->

Recorded from the built world (frontend, React 19 + Vite + Tailwind 4). Own UI; no component library. Four themes via `data-theme` on `<html>` (`light` Paper default per confirmed daytime-office scene), switchable from the topbar theme picker. Themes pair light and dark families: Paper + Forest (light), Printer Room + Steel (dark).

## Visual world

The continuing audit roll of the Property & Supply Office. The interface is the record: boxed running-block headers, monospace machine labels, hairline and tear-perforation rules, a pin-feed tractor margin on the app shell, and one ink-green accent that marks only active/current state. No decorative motion, no entrance choreography, no dashboard-card default.

## Palette

CSS variables defined in `frontend/src/index.css`. Semantic daisyUI-style class names are owned by this system (no library).

| Role | Paper (light) | Forest (light) | Printer Room (dark) | Steel (dark) |
|---|---|---|---|---|
| surface (base-100) | `#fdfbf4` | `#f6faf3` | `#20232a` | `#21242b` |
| ground (base-200) | `#f4f0e6` | `#edf3e7` | `#17191f` | `#181b21` |
| hairline (base-300) | `#e5dfd1` | `#dce7d3` | `#2c3038` | `#2e333d` |
| ink (base-content / primary / neutral) | `#23272e` | `#1f2a25` | `#e7e4da` | `#dfe4ea` |
| on-ink (primary-content) | `#fbf8f0` | `#f6faf3` | `#16181d` | `#16191f` |
| accent (active/current) | `#0e7a50` | `#177a44` | `#2fd18c` | `#5b8bef` |
| info / success / warning / error | `#2563eb` / `#0e7a50` / `#a16207` / `#b42318` | `#2563eb` / `#177a44` / `#9a6206` / `#b42318` | `#5ea2ff` / `#2fd18c` / `#f0b429` / `#ff6b5e` | `#6ea8ff` / `#3bbf75` / `#f0b429` / `#ff6b5e` |

Lines: ink at 14% (light) / 16% (dark), strong at 38% / 46%, via `color-mix` so hairlines tint the ink, never gray.

## Type

- Fira Sans (300–700 + italic 400) — UI/body; fixed rem scale, tight 1.125–1.2 steps, `tracking-tight` on headings with floors at `-0.04em`.
- Fira Code (400–600) — machine labels: form legends, table headers, badges, buttons, nav, dividers. Uppercase, letterspaced (`0.08em`–`0.16em`), size 0.5625–0.75rem.
- Tabular numerals in `.lgu-mono`, `.table`, and descendants.

## Components (all theme-aware, no hardcoded colors)

- **btn** — mono uppercase; default = hairline-outlined on surface, `btn-primary` = ink fill with on-ink text, ghost/outline/error/success variants; sizes sm/xs/lg, circle, square; hover 170ms ease, active pressed tint, disabled at 45%.
- **input / select / textarea** — transparent, hairline border, ink caret; focus = accent border + 2px ink-accent underline (`inset 0 -2px 0`) — the fanfold ink-underline; legend labels via `.fieldset-legend`.
- **table** — sticky sticky thead in mono uppercase tracked small caps; `border-bottom` rows are dashed tear-perforations; hover tints the row with accent at 5%.
- **badge** — mono uppercase pills; tinted fills per state (info/success/warning/error), `badge-primary` ink fill.
- **alert** — state-tinted fills (8% role color) with role-colored border + text; used inline and in toasts.
- **card** — surface + hairline + soft 1px-offset shadow; `.card-title` 600.
- **modal** — `<dialog class="modal">` full-viewport overlay (ink at 42%) centering `.modal-box`; `.modal-open` forces display for conditional dialogs.
- **drawer** — checkbox-driven side panel, 220ms ease; `lg:drawer-open` pins it as a sticky grid column on ≥1024px.
- **dropdown** — opens on `:focus-within`; end-aligned variant.
- **tabs / tabs-box / tab** — boxed pill segmented control; active tab = ink fill.
- **divider** — mono uppercase label between hairline rules.
- **join** — merged segmented controls (pagination, search).
- **loading** — `loading-spinner` ring (800ms linear), sizes xs–lg. Motion conveys state only; `prefers-reduced-motion` zeroes all animation/transition durations.

## Application surfaces

- **Login** — one container (`form-block`) capped at `max-w-4xl`: running `box-header` ("Official Block · Account Access Record"), split panel on ≥lg (brand/notes — Swiss hairline list, no icon cards, no kicker-above-heading — plus credentials form with ink-underline focus). No entrance animation.
- **App shell** — `.drawer` with `.pinfeed` tractor margin on the sidebar (1px ticks every 22px + hairline), sidebar nav as mono uppercase rows with row-number suffixes (01/02/03) and a 3px accent active marker; running header in the topbar (`REC-###` row label + current page). Footer as printed-manifest line.
- **Detail pages** — fanfold running headers (sticky thead), form blocks with mono legends, modal forms, dashed record separators.

## Motion

150–250ms state transitions only (hover, drawer, dropdown, modal fade). No page-load sequences, no decoration-only animation. Reduced-motion respected globally.

## Accessibility

Contrast: ink on surface ≥ 7:1 light / ≥ 12:1 dark; muted tints ≥ 4.5:1 foreground on ground. Visible `:focus-visible` = 2px accent outline offset 2px; ink accent for caret and selection. Touch targets ≥ 38px, controls ≥ 44px on touch. Keyboard: drawer via hidden checkbox label, dropdown via focus-within, modals native `<dialog>`. Every icon button carries `aria-label`.

## Provenance

PWA raster icons (`public/icons/*.png`) generated by `C:\Users\itcub\AppData\Local\Temp\opencode\gen-icons.js` (numeric "LGUGLYPH" 5x7 pixel-glyph, `#2563eb` full-bleed). No other shipping rasters exist.
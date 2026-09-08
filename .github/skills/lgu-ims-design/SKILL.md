---
name: lgu-ims-design
description: 'Build and style UI for the LGU Inventory Management System (React 19 + Vite + Tailwind 4). Use when creating or editing pages, components, forms, tables, modals, badges, buttons, or dashboard widgets in frontend/src. Covers the bespoke design system in frontend/src/index.css, the component class vocabulary, the portal modal pattern, and known pitfalls (lucide-react icon names, no shared Button primitive, toast context, print areas).'
---

# LGU IMS Design System

## When to Use
- Creating or editing any React page/component under `frontend/src/`
- Adding forms, tables, modals, badges, buttons, KPI cards, or dashboard widgets
- Styling anything with the bespoke CSS class system

## Source of Truth
- Design tokens + all component classes: `frontend/src/index.css`
- Design narrative: `DESIGN.md` (repo root) and `design-system/lgu-ims/MASTER.md`
- Shared UI primitives: `frontend/src/components/ui.jsx` (`PageHeader`, `FormModal`, `Badge`, `Money`, `Pagination`, `Spinner`, `EmptyState`)
- App shell: `frontend/src/components/Layout.jsx`; toasts: `frontend/src/components/Toast.jsx`
- Theme store: `frontend/src/stores/themeStore.js`

## Core Rules
1. **No component library, no Tailwind component classes.** Use the bespoke classes defined in `index.css`. Tailwind utilities are fine for layout/spacing, but never invent new component styles.
2. **No hardcoded colors.** Always reference CSS variables (`var(--surface)`, `var(--accent)`, `var(--text)`, `var(--muted)`, `var(--faint)`, `var(--border)`, `var(--success)`, `var(--warning)`, `var(--error)`) or the mapped Tailwind theme colors (`bg-surface`, `text-muted`, `border-border`, `text-accent`, etc.). Tinted fills use `color-mix(in oklab, var(--role) 8–15%, transparent)`.
3. **Two themes only** — `light` (cool slate) / `dark` (deep navy) via `data-theme` on `<html>`. Everything must work in both; never hardcode a light-only or dark-only value.
4. **Buttons are raw `<button className="btn ...">`** — there is NO shared Button component. Add icons per-use-site.
5. **Modals use the portal pattern** — `.modal-backdrop` → `.modal-box` (+ size class) → `.modal-header` / `.modal-body` / `.modal-footer`. For official forms use `FormModal` from `ui.jsx`. Do NOT use native `<dialog>` (legacy CSS only).
6. **Machine labels are mono uppercase** — JetBrains Mono, `letter-spacing 0.06–0.14em`, size 0.5625–0.75rem (table headers, badges, form legends, section labels, footers, SKUs).
7. **Fonts**: Inter (body), Sora (headings), JetBrains Mono (data/labels). Tabular numerals for money/stock/ledger figures.
8. **Print**: wrap printable content in `.print-area`; hide chrome with `.no-print`.
9. **Modals persist.** Never close a modal on backdrop click — remove the `onClick={(e) => { if (e.target === e.currentTarget) ... }}` handler from every `.modal-backdrop`. Close only via the `X` button, a **Cancel** button, or completing the action. The mobile drawer overlay is navigation chrome, not a modal — leave it as-is.

## Standard Page Pattern
1. `PageHeader` (title + subtitle + actions) from `ui.jsx`
2. **Search / Filter Bar** — `.card` with `.card-body py-3`, containing a flexible search input (icon-positioned, `pl-9`) + filter `<select>` or active-only checkbox. Always wrap in `bg-surface shadow-sm border-border`, never `bg-base-100`.
3. Content in `.card` + `.card-body` (or `.stat` for KPI tiles)
4. Tables: `.table` (or `.table-sm`, `.table-zebra`) with sticky mono uppercase thead
5. Actions as `.btn` variants; statuses as `.badge` pills
6. Forms in `.fieldset` + `.input` / `.select` / `.textarea` / `.checkbox`
7. Modals via portal pattern or `FormModal`
8. Pagination via `Pagination` from `ui.jsx`

## Search / Filter Bar Pattern
See [Component cheat-sheet > Search / Filter Bar](./references/components.md#search--filter-bar).
- Wrap in `.card.bg-surface.border-border`
- Search icon: absolute-positioned `lucide-react` `Search` at `left: 12px, top: 50%, transform: translateY(-50%)`, `color: var(--faint)`
- Input: `.input.input-sm.w-full` with `pl-9` to clear the icon
- Filter dropdown: `<select className="select select-sm" style={{ width: '10rem' }}>` — always `select-sm` (40px, aligns with the `input-sm` search input) and set width **inline**, never `md:w-40`/`md:w-44` (Tailwind v4 layered utilities lose to unlayered author CSS like `.select`, so the width silently fails and the select auto-expands to its widest option, crushing the search input)
- Always reset `setPage(1)` on search/filter change
- Use `<EmptyState>` and `<Spinner>` for loading/empty states in the table card, not inline text

> **Cascade-layer pitfall:** Tailwind v4 utilities live in a CSS `@layer`; unlayered author CSS (`.input-sm`, `.select`) beats them regardless of order. `pl-9` alone loses to `.input-sm`'s `padding-inline: 0.75rem`, letting the Search icon bleed into the placeholder. `index.css` already pins this with `input.input-sm.pl-9 { padding-left: 2.3rem }` — keep `pl-9` in markup, don't remove it.

## Known Pitfalls
- **Modals must NEVER close on backdrop click.** Remove the `onClick={(e) => { if (e.target === e.currentTarget) ... }}` handler from every `.modal-backdrop`. Close only via `X` button, Cancel button, or action completion. Modal persistence is a hard rule for government forms (prevents accidental data loss). The mobile drawer overlay is navigation chrome — leave it as-is.
- **lucide-react icon names must be verified** against the installed version before import — an invalid name breaks the build with `[MISSING_EXPORT] "X" is not exported by "node_modules/lucide-react/..."`. Verify from `frontend/` with:
  `node -e "const i=require('lucide-react'); console.log(Object.keys(i).filter(k=>typeof i[k]==='object').join('\n'))"`
- **Toast context value must be an object** (`useMemo(() => ({...}), [deps])`), not a function — a function makes `toast.success()` throw, and catch blocks mask it as a generic error.
- **No shared Button primitive** — every button is a raw `<button className="btn ...">`; icons must be added per-use-site.
- **Portal modals, not `<dialog>`** — the legacy `dialog.modal` CSS is deprecated.
- **Theme applied via `data-theme`** on `<html>` (see `themeStore.js`); persist with `localStorage['lgu-theme']`.

## References
- [Component cheat-sheet](./references/components.md) — every class, variant, and size
- [Page examples](./references/pages.md) — where each pattern lives in the codebase
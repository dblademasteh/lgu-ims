# Component Cheat-Sheet

All classes are defined in `frontend/src/index.css`. Theme-aware; never hardcode colors.

## Buttons — `.btn`
Raw `<button className="btn ...">`. Inter 600, hairline border, radius 10px, `shadow-sm`.
- Variants: `btn-primary` (blue gradient + white text + glow), `btn-ghost`, `btn-outline`, `btn-error`, `btn-success`, `btn-info`
- Sizes: `btn-sm` (2.25rem), `btn-xs` (1.875rem), `btn-lg` (3.25rem)
- Shapes: `btn-circle`, `btn-square`
- State: `btn-active` (current page in pagination), `btn-block` / `w-full`
- Disabled: `disabled` attr → 45% opacity

## Badges — `.badge`
Mono uppercase pills. Variants: `badge-ghost`, `badge-primary`, `badge-success`, `badge-warning`, `badge-error`, `badge-info`, `badge-outline`. Size: `badge-sm`. Use the `Badge` component in `ui.jsx` for status mapping.

## Cards — `.card`
Surface + hairline + `shadow-sm`, radius 14px. Children: `.card-body`, `.card-title` (Sora 700), `.card-actions`.

## Stats — `.stat`
KPI tile: `.stat-title` (mono uppercase), `.stat-value` (1.75rem 800 tabular), `.stat-desc`, `.stat-figure`.

## Tables — `.table`
Sticky mono uppercase thead on `surface-alt`; `border-bottom` rows; hover = accent 5% tint.
- `.table-sm` compact; `.table-zebra` alternating rows
- Sortable headers: `.sort-header` (+ `.sort-header--right`)

## Forms
- `.fieldset` + `.fieldset-legend` (label)
- `.input` (height 3rem, radius 10px; `.input-sm`, `.input-bordered`), `.select` (custom chevron; `.select-sm`), `.textarea`, `.checkbox`
- Focus = accent border + 3px accent ring (`color-mix` 18%)

## Tabs — `.tabs` / `.tabs-box` / `.tab`
Boxed segmented control; active = `.tab-active` (surface fill + accent text + `shadow-sm`).

## Alerts — `.alert`
State-tinted fills (8% role color) + role border/text. Variants: `alert-success`, `alert-warning`, `alert-error`, `alert-info`. Also used as toast bodies.

## Modal system (portal pattern)
Structure: `.modal-backdrop` → `.modal-box` → `.modal-header` / `.modal-body` / `.modal-footer`.
- Sizes: `modal-sm` (20rem), `modal-md` (28rem), `modal-lg` (36rem), `modal-xl` (48rem), `modal-2xl` (64rem), `modal-full` (80rem) — the size class goes on the **same element** as `.modal-box` (`className="modal-box modal-lg"`); CSS uses `.modal-box.modal-lg` (a `.modal-lg .modal-box` descendant rule never matches and the modal falls back to content width)
- Header: `.modal-title`, `.modal-subtitle`, `.modal-close`
- Body: `.modal-body` (+ `--flush`, `--spacious`); Footer: `.modal-footer` (+ `--between`), `.modal-action`
- Form grid: `.modal-form-grid` (2-col, `.form-full` spans)
- Confirm: `.modal-confirm-icon` (+ `--warn` / `--danger` / `--info` / `--success`)
- Inline alert: `.modal-alert` (+ `--error` / `--warning` / `--success` / `--info`)
- QR: `.modal-qr-img`; Scan: `.modal-scan-viewport`; Loading: `.modal-loading`

### FormModal (official form shell) — `ui.jsx`
`<FormModal title formNo icon tone badge size onClose>` — 4px tone accent bar (`.fm-accent--success/danger/info/neutral`), seal tile (`.fm-seal--*`), title + mono "Form No." caption (`.fm-form-no`), optional badge, close button. Children render raw after header.

## Drawer / Sidebar / Topbar
- `.drawer` + `.lg:drawer-open` (pins ≥1024px) + `.collapsed` (4.5rem rail); mobile: `.drawer-overlay`, `.drawer-side.drawer-open`
- Sidebar: `.sidebar-brand` (+ `-icon`, `-text`, `-sub`), `.sidebar-section` (+ `-label`), `.sidebar-user` (+ `-info`, `-name`, `-role`)
- Nav: `.nav-item` (+ `.active` = accent tint + 3px left marker)
- Topbar: `.topbar`, `.topbar-breadcrumb` (+ `-current`), `.topbar-actions`
- Dropdown: `.dropdown` + `.dropdown-content` (opens on `:focus-within`)

## Misc primitives
- `.divider` (mono uppercase label between rules), `.join` + `.join-item` (merged controls)
- `.loading` / `.loading-spinner` (+ `loading-xs`), `.progress` + `.progress-bar` (+ `progress-success/warning/error`)
- `.avatar` (+ `avatar-sm`, `avatar-lg`)
- `.pagination` + `.pagination-info` + `.pagination-controls`
- `.lbl`, `.mono`, `.truncate`, `.rounded-box`, `.subtext`, `.text-right`, `.text-error`, `.hover`, `.font-mono`, `.font-medium`, `.flex-1`, `.flex-2`

## Page layout
`.page-header` (+ `-row`, `-actions`), `.page-content`, `.page-inner` (max-width 1400px, 1.75rem padding).

## Items page (specialized)
- Filters: `.items-filters`, `.items-search-wrap` (+ `-icon`, `-input`, `-clear`), `.items-filter-select`, `.items-lowstock-toggle`
- Table: `.items-table-wrap`, `.items-table`, `.items-stock-cell` (+ `.low` / `.ok`), `.items-stock-unit`, `.items-actions-cell`, `.items-thumb` (+ `-placeholder`)
- Slide-over: `.item-panel-overlay`, `.item-panel-backdrop`, `.item-panel` (22rem right panel), `.item-panel-header`, `.item-panel-label`, `.item-panel-image` (+ `-upload`), `.item-panel-body`, `.item-panel-title`, `.item-panel-sku`, `.item-panel-stock-gauge` (+ `-header`, `-label`, `-value`), `.item-panel-gauge` (+ `-fill`, `-meta`), `.item-panel-grid`, `.item-panel-field-label` / `-value`, `.item-panel-description`, `.item-panel-ledger-*`, `.item-panel-footer`, `.item-panel-action`
- Adjust modal: `.adj-modal`, `.adj-accent--in/out`, `.adj-seal--in/out`, `.adj-op-badge--in/out`, `.adj-item-block`, `.adj-section-label`, `.adj-item-grid`, `.adj-op-toggle` + `.adj-op-btn` (+ `active-in` / `active-out`), `.adj-projection--in/out`, `.adj-proj-*`, `.adj-input-wrap` (+ `-icon`), `.adj-req`, `.adj-footer`

## Dashboard (specialized)
- `.kpi-card` (+ `-icon`, `-value`, `-label`), `.chart-card` (+ `-header`, `-title`), `.alert-row` (+ `-icon`, `-name`, `-meta`, `-badge`), `.budget-card` (+ `-header`, `-name`, `-pct`, `-amount`)
- Grids: `.kpi-grid`, `.charts-grid`, `.alerts-grid`, `.budget-grid`; header: `.dash-greeting`, `.dash-date`, `.dash-updated`, `.dash-actions`, `.dash-list`, `.dash-empty`, `.dash-link`

## Settings page (specialized, `sp-*`)
- `.sp-tab-bar` + `.sp-tab` (+ `.active` = accent underline), `.sp-card` (+ `-head`, `-title`, `-sub`), `.sp-toolbar`, `.sp-search` (+ `-icon`, `-input`), `.sp-view-toggle`
- `.sp-table-wrap` + `.sp-table`, `.sp-badge`, `.sp-tree-wrap` + `.sp-tree-row` (+ `-chevron`, `-name`, `-meta`, `-actions`)
- `.sp-form` (+ `-row`), `.sp-field`, `.sp-label`, `.sp-hint`
- `.sp-status-row` + `.sp-status-badge` (+ `badge-on` / `badge-off`), `.sp-toggle` (+ `.on`, `-thumb`), `.sp-key-form`, `.sp-key-banner` (+ `-label`, `-key`), `.sp-qr`, `.sp-secret`, `.sp-backup-action`, `.sp-flags` + `.sp-flag-row` (+ `-info`, `-key`, `-meta`), `.sp-animate-in`

## Icons
- Import from `lucide-react` with **verified names** (check `node -e "const i=require('lucide-react'); console.log(Object.keys(i).filter(k=>typeof i[k]==='object').join('\n'))"`)
- Common: `Search`, `X`, `Plus`, `Save`, `User`, `Building2`, `Phone`, `Mail`, `MapPin`, `CalendarDays`, `FileText`, `Download`, `UploadCloud`, `CheckCircle2`, `XCircle`, `Trash2`, `SquarePen`, `Ban`

## Search / Filter Bar
Reusable pattern for any list page (PO List, Suppliers, Receivings, etc.).

### Structure
```jsx
<div className="card bg-surface shadow-sm border border-border mb-4">
  <div className="card-body py-3">
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1 md:max-w-md">
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)' }} />
        <input
          type="search"
          className="input input-sm w-full pl-9"
          aria-label="Search purchase orders"
          placeholder="Search PO number…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        {search && (
          <button type="button" className="btn btn-ghost btn-xs btn-square"
            style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)' }}
            onClick={() => setSearch('')} aria-label="Clear search"><X size={12} /></button>
        )}
      </div>
      {/* Filter dropdown */}
      <select className="select select-sm" style={{ width: '10rem' }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
        {FILTER_OPTIONS.map((f) => <option key={f} value={f}>{...}</option>)}
      </select>
      {/* Active-only toggle */}
      <label className="flex items-center gap-2 cursor-pointer text-sm">
        <input type="checkbox" className="checkbox checkbox-sm" checked={activeFilter} onChange={(e) => setActiveFilter(e.target.checked)} />
        <span className="text-muted">Active only</span>
      </label>
    </div>
  </div>
</div>
```

### Key Rules
1. **Card wrapper** — `.card.bg-surface.shadow-sm.border-border` with `.card-body.py-3`; never use `bg-base-100` (non-theme class)
1. **Icon positioning** — `Search` icon at `position: absolute, left: 12px, top: 50%, transform: translateY(-50%)` with `color: var(--faint)`; input uses `pl-9` to clear the icon. Always use `lucide-react` — never inline SVG. **Note:** `pl-9` alone loses to `.input-sm`'s unlayered `padding-inline: 0.75rem` (Tailwind v4 layers lose to unlayered author CSS). `index.css` pins the gutter with `input.input-sm.pl-9 { padding-left: 2.3rem }` — keep `pl-9` in markup.
2. **Input element** — must have `type="search"` and `aria-label="Search <entity>"`, `className="input input-sm w-full pl-9"`
3. **Filter dropdown width & height** — always `select select-sm` (40px tall, aligns with the `input-sm` search input) with inline `style={{ width: '10rem' }}` (160px). Do NOT use `md:w-40`/`md:w-44` — responsive width utilities are not reliably emitted/effective here, and a select without a width cap auto-expands to its widest option (e.g. "PARTIALLY ISSUED"), blowing out to full row width and crushing the search input. Three dropdown categories exist: (1) **toolbar filters** — `select select-sm` + inline width (160px standard, Items category 192px, Items limit 96px, Ledger flex-1 12–22rem); (2) **report parameter selects** — full-width form fields inside `ReportCard`s, sized to their card column (no capping needed); (3) **modal form selects** — sized by `.modal-form-grid` columns, full-span or half-span fields
4. **Clear button** — when text is present, render an absolutely-positioned `X` icon button at `right: 6px, top: 50%, transform: translateY(-50%)` that clears the search and resets page to 1
5. **Placeholder text** — follows `Search <entity>…` pattern with a single ellipsis character `…` (U+2026)
6. **Trigger page reset** on any filter change: `setPage(1)`
7. **Search icon** (`lucide-react`) must be imported — verify the name is valid for the installed version
8. **Responsive layout** — `flex-col sm:flex-row` so filters stack on mobile, align on desktop
9. **No backdrop handler** inside search cards — only modals need that rule
10. **Clear state on reset** — when opening a new modal or switching tabs, reset search/filter states to defaults

### Filter Bar States
- **Empty results** → `<EmptyState message="No purchase orders found." />` (not inline text)
- **Loading** → `<Spinner label="Loading suppliers…" />` inside the table card body
- **Search + filter combo** — both apply simultaneously; search filters by text match, dropdown filters by status/match-state

### Common filter presets:
- PO pages: `ALL`, `MATCHED`, `PARTIAL`, `SHORT` (based on receiving status)
- Generic: `ALL`, `ACTIVE`, `INACTIVE` (or `PENDING`, `APPROVED`, `RECEIVED`, `CANCELLED`)

- `.gov-login` (full-viewport navy gradient + grid overlay), `.gov-login-shell` (split 1.05fr/1fr), `.gov-login-brand` (+ `-inner`, `-desc`, `-foot`), `.gov-login-seal`, `.gov-login-agency`, `.gov-login-title`, `.gov-login-subtitle`, `.gov-login-divider`, `.gov-login-features` + `.gov-login-feature` (+ `-icon`, `-text`)
- `.gov-login-form-panel` (+ `-inner`), `.gov-login-welcome` (+ `-title`, `-sub`)
- `.gov-form` (+ `-group`, `-alt`), `.gov-label`, `.gov-field` (+ `-icon`), `.gov-input` (+ `-wrap`), `.gov-toggle-pw`, `.gov-error`, `.gov-btn` (+ `-primary`, `-ghost`), `.gov-link`
- Demo: `.gov-demo-divider`, `.gov-demo-grid`, `.gov-demo-btn` (+ `-label`, `-meta`)
- Forgot modal: `.gov-modal` (+ `-close`, `-inner`, `-icon--info/success`, `-title`, `-desc`, `-actions`, `-back`, `-success-card`, `-success-title`, `-steps`)
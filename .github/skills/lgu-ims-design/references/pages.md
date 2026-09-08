# Page Examples

Where each pattern lives in the codebase. Use these as reference implementations when building new pages.

## App shell — `frontend/src/components/Layout.jsx`
- `.drawer` + `.lg:drawer-open` + `.collapsed` (persisted `lgu_sidebar_collapsed`)
- Sidebar brand, grouped nav (Operations / Oversight / Administration), `.nav-item.active`
- Topbar: hamburger, collapse toggle, breadcrumb, theme toggle, notifications bell (unread badge), avatar `.dropdown`
- Footer: mono uppercase manifest line
- Portal modals: change-password, sign-out-all

## Login — `frontend/src/pages/LoginPage.jsx`
- `.gov-login` split shell; brand panel + form panel
- Multi-step: credentials → 2FA code → forced password change
- Forgot-password `.gov-modal` with numbered steps
- Demo accounts behind `VITE_SHOW_DEMO_ACCOUNTS`

## Dashboard — `frontend/src/pages/DashboardPage.jsx`
- `.kpi-card` grid, `.chart-card` (recharts), `.alert-row` (low stock / expiry), `.budget-card` + `.progress`

## Items & Stock — `frontend/src/pages/ItemsPage.jsx`
- `.items-table` with `.sort-header`, thumbnails, low-stock cells
- `.item-panel` slide-over (detail + stock gauge + ledger)
- `FormModal` for item form; `.adj-*` adjust-stock modal (in/out)
- QR modal, scan modal, image upload modal, archive confirm modal

## Requisitions (RIS) — `frontend/src/pages/RISPage.jsx`
- `PageHeader`, `.card` + `.table`, `Badge` status mapping, `Money`
- `FormModal` for create; approve modal (`.modal-xl`)
- Detail modal with `.print-area` + `.no-print` actions (print, PAR, acknowledgment)

## Receiving — `frontend/src/pages/ReceivingPage.jsx`
- `FormModal` (`.modal-lg`) with line-item grid
- `.table-zebra` list; detail modal; `.print-area` receiving record

## Settings — `frontend/src/pages/SettingsPage.jsx`
- `.sp-tab-bar` horizontal tabs, `.sp-card`, `.sp-search` toolbar
- Tree/table toggle (`.sp-tree-*` / `.sp-table`), `.sp-toggle` switches
- API keys (`.sp-key-banner`, `.sp-secret`), 2FA QR, backup

## Other pages
- `BudgetPage.jsx`, `PhysicalCountPage.jsx`, `PurchaseOrdersPage.jsx`, `UsersPage.jsx`, `SuppliersPage.jsx` — `.card` + `.table` + portal modals + `PageHeader`
- `ReportsPage.jsx` — report cards with export buttons
- `NotificationsPage.jsx` — list + mark-all-read
- `AuditLogPage.jsx`, `COACompliancePage.jsx` — `.stat` tiles + tables
- `LedgerPage.jsx` — ledger card view + report links
- `ProfilePage.jsx` — profile form
- `ResetPasswordPage.jsx` — `.alert` error + form

## Shared primitives — `frontend/src/components/ui.jsx`
- `PageHeader`, `FormModal`, `Badge` (status map), `Money` (₱ tabular), `Pagination`, `Spinner`, `EmptyState`
- `Toast.jsx` — `useToast()` → `toast.success/error/info/warning` (bottom-end, auto-dismiss 4.5s)
- `ScanModal.jsx` — `@zxing/browser` QR/barcode scanner in `.modal-box`
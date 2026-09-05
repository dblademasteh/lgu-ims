# LGU IMS — Gap Analysis Report

**Project:** `lgu_ims`  
**Date:** 2026-09-05  
**Stack:** React 19 + Express 5 + Prisma 6 + PostgreSQL 16  
**Scope:** Full-stack gap analysis (schema, backend, frontend, UX, compliance)

---

## 1. Executive Summary

### Overall Readiness Score: 5.5 / 10

The system has a **solid core** — it covers the fundamental inventory loop (items → receiving → RIS → ledger → reports) with role-based access control, 2FA, audit logging, and PDF/Excel reporting. However, it is **not production-ready for a Philippine LGU** without addressing critical gaps in procurement governance, property accountability, COA compliance, data integrity, and security hardening.

### Top 3 Critical Gaps (P0)

| # | Gap | Impact |
|---|-----|--------|
| 1 | **No Purchase Order (PO) workflow** — PO/DR numbers are text fields only; no PO creation, approval, matching, or budget control | Procurement cannot be audited against RA 9184; no 3-way matching |
| 2 | **No Property Accountability (PAR/ICS/APP)** — no Property Acknowledgement Receipt, no semi-expendable/ITE tracking, no acknowledgment slip on issue | COA cannot verify property custodian accountability; RA 9184 Section 5, Rule VII violation |
| 3 | **Race condition in RIS number generation** (`utils/risNumber.js`) — `findFirst` + string parsing under concurrent load can produce duplicate RIS numbers | Corrupts COA-sequential numbering; legal/compliance violation |

### Top 3 Medium Gaps (P1)

| # | Gap | Impact |
|---|-----|--------|
| 1 | **`updateReceiving()` non-atomic double-entry** (`receivingController.js:130-173`) — reversal loop and re-application are in one transaction but each item is re-read independently; concurrent edits of the same receiving can double-reverse or skip reversal | Stock corruption |
| 2 | **No stock floor validation in `cancelRis` and `returnRisItems`** — stock is added without an upper bound; an item issued then returned repeatedly in a tight loop goes arbitrarily high | Data integrity violation |
| 3 | **Login brute-force limiter is too weak** — `strictAuthLimiter` is 10 attempts/hour (not per minute); no account lockout, no concurrent session limit, no login history | Credential stuffing feasible; no forensic trail |

---

## 2. Feature Gap Analysis

### A. Core Inventory

| Feature | Status | Notes |
|---------|--------|-------|
| CRUD items with SKU, unit, category, cost | ✅ Implemented | `itemController.js`, schema |
| Stock levels & reorder threshold | ✅ Implemented | `currentStock`, `reorderThreshold` |
| Low-stock alerts | ✅ Implemented | In-app + email |
| QR/barcode generation per item | ✅ Implemented | `itemController.itemQR` |
| CSV import/export | ✅ Implemented | `importItems`, `exportItems` |
| Image upload per item | ✅ Implemented | Multer + `uploadItemImage` |
| Stock adjustments (IN/OUT) | ✅ Implemented | `adjustStock` with audit trail |
| Item image display in list | ✅ Implemented | Frontend |
| **Unit cost history / weighted average** | ⚠️ WEAK | `Item.unitCost` is overwritten on each receiving; no historical cost per batch |
| **Max stock / capacity limits** | ❌ MISSING | No upper bound; receiving can overfill indefinitely |
| **Item condition/status** | ❌ MISSING | No `SERVICEABLE / UNSERVICEABLE / CONDEMNED` field; affects PAR accuracy |
| **Item expiry / warranty / shelf-life** | ❌ MISSING | Medical supplies, chemicals have expiry — no tracking |
| **Item serial number / asset tag** | ⚠️ INCOMPLETE | `stockNumber` is a free-text field; no serial tracking, no asset tag prefix logic |
| **Bulk move / transfer between locations** | ❌ MISSING | No sub-location or warehouse concept |
| **Inventory aging / obsolescence report** | ❌ MISSING | Required for COA property aging |
| **Physical count worksheet** | ❌ MISSING | No count sheet generation, no variance detection workflow |
| **Item decommissioning / disposal** | ❌ MISSING | No condemned/disposed status; items are only archived |

### B. Requisition & Issue Slip (RIS)

| Feature | Status | Notes |
|---------|--------|-------|
| RIS creation with line items | ✅ Implemented | `risController.createRis` |
| Approval / rejection workflow | ✅ Implemented | `approveRis`, `rejectRis` |
| Partial approval (override qty) | ⚠️ INCOMPLETE | Frontend doesn't expose partial approval UI; `approveRis` supports override but UI sends full request only (`RISPage.jsx:398-400`) |
| Partial issuing (PARTIALLY_ISSUED) | ✅ Implemented | `issueRis` auto-detects remaining |
| Stock short issuance (silent cap) | ⚠️ WEAK | `issueRis` silently caps to `currentStock` with only `anyShort` flag; no notification to requestor that full qty wasn't issued |
| RIS cancellation with stock restore | ✅ Implemented | `cancelRis` |
| Item return to stock | ✅ Implemented | `returnRisItems` |
| RIS numbering (year-sequential) | ⚠️ WEAK | `generateRisNumber` has race condition (see §3) |
| **Acknowledgment slip / acknowledgment of receipt** | ❌ MISSING | No signed acknowledgment slip at issue time |
| **Multi-level approval (e.g., budget, certifying)** | ❌ MISSING | Only single-level approve/reject |
| **Budget / appropriation check on RIS** | ❌ MISSING | No fund availability check before approving |
| **RIS template for printing** | ✅ Implemented | Frontend print modal in `RISPage.jsx` |
| **Bulk RIS creation** | ❌ MISSING | Only one-at-a-time |

### C. Receiving & Supplier Management

| Feature | Status | Notes |
|---------|--------|-------|
| Supplier CRUD with soft-delete | ✅ Implemented | `receivingController` |
| Receiving record with PO/DR | ✅ Implemented | `Receiving` model |
| Auto stock update on receiving | ✅ Implemented | Ledger entry + item balance |
| Receiving edit with reversal | ✅ Implemented | `updateReceiving` |
| Receiving delete with reversal | ✅ Implemented | `deleteReceiving` |
| ReceivingNo uniqueness | ❌ MISSING | No uniqueness constraint in schema or controller; duplicates possible |
| **Purchase Order (PO) creation & management** | ❌ MISSING | No `PurchaseOrder` model; PO number is free-text |
| **3-way matching (PO vs DR vs Receiving)** | ❌ MISSING | Cannot enforce qty/price match against PO |
| **Supplier performance tracking** | ❌ MISSING | No delivery timeliness, quality scoring |
| **Supplier classification (LBBB, etc.)** | ❌ MISSING | No PhilGeps/RA 9184 supplier classification |
| **Partial receiving / backorder** | ⚠️ WEAK | No backorder tracking; receiving creates a single flat record |
| **Quotation / canvass sheet** | ❌ MISSING | Required pre-procurement step |
| **Inspection/acceptance sheet (IAS)** | ❌ MISSING | Required after receiving |

### D. User & Role Management

| Feature | Status | Notes |
|---------|--------|-------|
| 5 roles (ADMIN, WAREHOUSE_STAFF, PROPERTY_CUSTODIAN, AUDITOR, DEPARTMENT_HEAD) | ✅ Implemented | Prisma enum |
| Role-based menu + route guards | ✅ Implemented | Frontend + backend `authorize()` |
| User CRUD | ✅ Implemented | `userController` |
| Self-service password change | ✅ Implemented | `changePassword` |
| Forgot password + reset token | ✅ Implemented | 1h expiry |
| 2FA (TOTP) | ✅ Implemented | `otplib` + QR setup |
| **Password expiry policy** | ❌ MISSING | `passwordChangedAt` is stored but never checked; passwords never expire |
| **Login history / last login display** | ❌ MISSING | `passwordChangedAt` exists but no `lastLoginAt`; Auditor has no login trail |
| **Concurrent session management** | ❌ MISSING | JWT is valid for 7 days with no session revocation |
| **User profile self-service (name, email, dept)** | ❌ MISSING | Users cannot edit own profile; only ADMIN can |
| **Email verification on registration** | ❌ MISSING | Email is set but never verified |
| **Password history** | ❌ MISSING | Cannot prevent reuse of last N passwords |
| **Account lockout after N failed attempts** | ❌ MISSING | Rate limiter is soft (10/hr); account never locks |
| **Impersonation / audit-as-user** | ❌ MISSING | No support for ADMIN to view AS another role |
| **Bulk user operations** | ❌ MISSING | No bulk import of users |
| **User activity summary** | ❌ MISSING | No per-user action count dashboard |

### E. Notifications & Alerts

| Feature | Status | Notes |
|---------|--------|-------|
| In-app notifications | ✅ Implemented | `Notification` model + paginated list |
| Unread count badge | ✅ Implemented | Polled every 60s in `Layout.jsx` |
| Mark read / mark all read | ✅ Implemented | `notificationController` |
| Notification cleanup (>90 days) | ✅ Implemented | Manual endpoint |
| Low-stock in-app + email alert | ✅ Implemented | `notifyLowStock` |
| RIS status change email | ✅ Implemented | Approved/rejected/issued |
| **Push / browser notifications** | ❌ MISSING | No Web Push API; only polling |
| **SMS notifications** | ❌ MISSING | No SMS gateway integration |
| **Email digest (daily/weekly summary)** | ❌ MISSING | Each low-stock event sends individual email; no digest |
| **Notification preferences per user** | ❌ MISSING | Users cannot opt out of RIS or low-stock notifications |
| **Notification categories beyond LOW_STOCK/RIS/SYSTEM** | ❌ MISSING | No RETURN confirmation, ISSUANCE confirmation, APPROVAL reminder |

### F. Reporting & Analytics

| Feature | Status | Notes |
|---------|--------|-------|
| RSMI (Report of Supplies and Materials Issued) | ✅ Implemented | PDF + Excel |
| Inventory Summary | ✅ Implemented | PDF + Excel |
| Stock Movement History | ✅ Implemented | PDF + Excel |
| Ledger Card per item | ✅ Implemented | PDF + Excel |
| Dashboard with stats | ✅ Implemented | Items, categories, pending RIS, low stock, issued this month |
| **PAR (Property Acknowledgement Receipt)** | ❌ MISSING | The cornerstone COA document; not generated |
| **ICS (Inventory Custodian Slip)** | ❌ MISSING | Not generated |
| **APP (Annual Property Plant & Equipment)** | ❌ MISSING | Not generated |
| **Physical Count / Inventory Taking Report** | ❌ MISSING | No count sheet, no variance report |
| **Obsolete / unserviceable items report** | ❌ MISSING | No disposal report |
| **Semi-expendable property report** | ❌ MISSING | No classification for PPE under RA 9184 threshold |
| **Report scheduling / automated email** | ❌ MISSING | Manual download only |
| **Custom report builder** | ❌ MISSING | Fixed reports only |
| **Dashboard trend charts** | ❌ MISSING | No time-series charts; only current values |
| **Budget utilization / spending by dept** | ❌ MISSING | No budget module at all |
| **Issuance by department breakdown** | ⚠️ WEAK | RSMI has dept filter but no totals breakdown chart |
| **Dashboard date filter (broken)** | ⚠️ INCOMPLETE | `dashboardStats` ignores `from`/`to` for all stats except `recentLedger`; line 153-158 uses `monthStart`/`monthEnd` regardless of query params |

### G. Audit & Compliance

| Feature | Status | Notes |
|---------|--------|-------|
| Audit log with before/after JSON | ✅ Implemented | `AuditLog` model |
| Audit log pagination + filter | ✅ Implemented | By action, entity, user, date |
| Audit log export (PDF/Excel) | ✅ Implemented | `auditController.exportAuditLogs` |
| IP address captured | ✅ Implemented | `x-forwarded-for` or `req.ip` |
| COA-compliant ledger card | ✅ Implemented | Reference type, inflow, outflow, balance |
| **Immutable / append-only audit log** | ❌ MISSING | Audit records can be updated or deleted via Prisma; no DB-level append-only constraint |
| **Tamper-evident / signed audit trail** | ❌ MISSING | No hash chain or digital signing |
| **COA-specific compliance dashboard** | ❌ MISSING | No COA Circular 2020-001 / 2021-002 specific reports |
| **Log retention policy** | ❌ MISSING | `cleanupOldNotifications` exists for notifications; no equivalent for audit logs; no retention config |
| **Data retention / archival policy** | ❌ MISSING | No year-end close or data archival process |
| **Disaster recovery documentation** | ❌ MISSING | Shell scripts exist (`backup.sh`, `restore.sh`) but no UI, no scheduling, no documentation |

### H. System Administration

| Feature | Status | Notes |
|---------|--------|-------|
| Health check endpoint | ✅ Implemented | `GET /api/health` |
| Reference data (categories, departments) | ✅ Implemented | CRUD + frontend |
| API key management | ✅ Implemented | Create/revoke with expiry |
| Swagger API docs | ✅ Implemented | `/api/docs` |
| Theme switcher (light/dark) | ✅ Implemented | Zustand store |
| **System settings / configuration UI** | ❌ MISSING | No UI for SMTP config, app URL, CORS; all env vars |
| **Database backup/restore UI** | ❌ MISSING | Only shell scripts; no scheduler, no UI |
| **Database migration management** | ⚠️ WEAK | Prisma migrations exist but no migration runner UI; `prisma migrate dev` for prod is unsafe |
| **Multi-LGU / tenant isolation** | ❌ MISSING | Single-tenant only; no multi-LGU support |
| **Maintenance mode** | ❌ MISSING | No way to put system in read-only mode for maintenance |
| **Feature flags** | ❌ MISSING | No gradual rollout mechanism |
| **System logs viewer** | ❌ MISSING | No access to application logs from within the app |
| **Background job queue** | ❌ MISSING | Email sending is fire-and-forget; no retry queue, no job status |

### I. Mobile / Offline / Integration

| Feature | Status | Notes |
|---------|--------|-------|
| Responsive web layout | ⚠️ PARTIAL | Uses Tailwind responsive classes; some tables may overflow on small screens without horizontal scroll |
| Barcode/QR scanning (frontend) | ✅ Implemented | `@zxing/browser` + `ScanModal.jsx` |
| No native mobile app | ❌ MISSING | Web-only; no field inventory capability for warehouse staff |
| **Offline mode / PWA service worker** | ⚠️ INCOMPLETE | `frontend/public/sw.js` exists but is empty/minimal; no actual caching or sync |
| **Offline-first data sync** | ❌ MISSING | All operations require online; no conflict resolution |
| **Accounting system integration** | ❌ MISSING | No export to TBAS, no API for accounting module |
| **HRIS/SSO integration** | ❌ MISSING | `externalId` column exists on User but no SSO logic |
| **PhilGEPS / e-procurement integration** | ❌ MISSING | No procurement exchange format |
| **Webhook / event hooks** | ❌ MISSING | No event emission for external subscribers |
| **CSV/Excel bulk import for master data** | ✅ Items only | No bulk import for users, suppliers, departments |

### J. Security & Access Control

| Feature | Status | Notes |
|---------|--------|-------|
| JWT authentication | ✅ Implemented | With `passwordChangedAt` invalidation |
| Role-based access (5 roles) | ✅ Implemented | `authorize()` middleware |
| 2FA (TOTP) | ✅ Implemented | Full setup/enable/disable flow |
| Rate limiting (login, general) | ✅ Implemented | express-rate-limit |
| API key auth | ✅ Implemented | SHA-256 hash; prefix lookup |
| Bcrypt password hashing | ✅ Implemented | 10 rounds |
| CSRF protection | ❌ MISSING | No CSRF tokens; SPA with Bearer token mitigates but not eliminated |
| Input sanitization | ⚠️ WEAK | `sanitizeString` strips `< >` tags but does NOT escape HTML entities; XSS risk in remark fields rendered in PDF |
| Content Security Policy headers | ❌ MISSING | No CSP, HSTS, or security headers middleware |
| **JWT secret fallback to dev value** | ⚠️ CRITICAL | `config.js:6`: `jwtSecret` falls back to `'dev-secret-change-me'` if env var is absent; in production this makes all JWTs trivially forgeable |
| **No refresh token rotation** | ❌ MISSING | JWT lives for 7 days; no refresh token mechanism; users must re-login |
| **No account lockout** | ❌ MISSING | Rate limiter is 10 attempts/hour, never locks the account |
| **No password expiry** | ❌ MISSING | `passwordChangedAt` stored but never enforced |
| **No login history** | ❌ MISSING | Audit log has LOGIN entries but no `lastLoginAt` on user for quick lookup |
| **No concurrent session limit** | ❌ MISSING | Unlimited simultaneous sessions per user |
| **CORS wildcard when env misconfigured** | ⚠️ WEAK | `app.js:14`: if `corsOrigins` includes `'*'`, any origin is accepted |
| **No audit log immutability** | ❌ MISSING | No DB trigger or Prisma middleware preventing UPDATE/DELETE on AuditLog |
| **No request size validation beyond 2MB** | ⚠️ WEAK | JSON body limit is 2MB; no per-endpoint limits |
| **No SSRF protection on `appUrl`** | ❌ MISSING | `config.appUrl` is used in email links; if attacker controls it, links point to attacker server |
| **File upload path traversal prevention** | ⚠️ WEAK | `multer` generates random filename (good), but no content-type verification beyond MIME sniffing |
| **No HSTS / security headers** | ❌ MISSING | No Helmet.js or equivalent |

---

## 3. Data Integrity & Business Logic Risks

### 3.1 RIS Number Race Condition
**File:** `backend/src/utils/risNumber.js`

```js
const last = await prisma.ris.findFirst({ where: { risNumber: { startsWith: prefix } }, orderBy: { risNumber: 'desc' } });
```

Under concurrent `createRis` calls, two requests can both read the same `last` RIS number and produce the same next number, resulting in a `P2002` unique constraint violation or silent skip. There is no database sequence, advisory lock, or serializable transaction isolation.

### 3.2 Non-Atomic `updateReceiving`
**File:** `backend/src/controllers/receivingController.js:130-173`

The pattern "reverse all old items, then re-apply new items" runs in one Prisma transaction, but if two requests edit the same receiving simultaneously:
- Request A reverses all items (item.currentStock goes down)
- Request B's reversal reads stale `item.currentStock` and subtracts again
- Net result: double subtraction → negative stock

### 3.3 No Stock Floor in `cancelRis` / `returnRisItems`
**Files:** `risController.js:382-413` (cancel), `risController.js:426-453` (return)

Both functions add to `item.currentStock` without checking for an upper bound or overflow. A rapid cancel-then-reissue loop can inflate stock without any ceiling.

### 3.4 `runningBalance` is Stale, Not Computed
**File:** `ledgerController.js:311-323` (issuance), `itemController.js:209-220` (adjustment)

`runningBalance` is written at creation time from `item.currentStock`. If any ledger entry is missed (e.g., transaction failure after item update), `runningBalance` drifts from the true computed sum of `SUM(inflow) - SUM(outflow)`.

### 3.5 `importItems` is Not Transactional
**File:** `itemController.js:283-371`

CSV rows are inserted one-by-one. A failure mid-import (e.g., network drop, unique constraint on row 50 of 200) leaves rows 1-49 committed. There is no all-or-nothing guarantee, and `created`/`updated` counts are inaccurate if errors occur.

### 3.6 Receiving Number Uniqueness Not Enforced
**File:** `receivingController.js:59-68`, `schema.prisma`

`Receiving.receivingNo` is `@unique` in the schema (good), but `createReceiving` doesn't check for duplicates before creating, so the user only sees an unhandled `P2002` error rather than a friendly message.

### 3.7 Unit Cost Overwrite on Each Receiving
**File:** `receivingController.js:93`

```js
data: { currentStock: newBalance, unitCost: ri.unitCost ? Number(ri.unitCost) : item.unitCost }
```

Each receiving silently overwrites `Item.unitCost`. There is no weighted-average recalculation and no historical cost per batch. Financial reports using `unitCost` may show the most-recent-receipt cost rather than a true average.

### 3.8 Dashboard Date Filter is Broken
**File:** `userController.js:125-158`

```js
const monthStart = start || new Date(...);
const monthEnd = end || new Date();
```

The `from` and `to` query parameters are parsed but then **ignored** for `totalItems`, `totalCategories`, `pendingRis`, `issuedThisMonth`, and `lowStockItems`. Only `recentLedger` uses the date range. The dashboard date picker gives false feedback.

### 3.9 Seed Script Hardcodes Default Password
**File:** `prisma/seed.js:21`

```js
const password = bcrypt.hashSync('Password123!', 10);
```

If seed is run after initial setup, it **overwrites** existing user passwords with `Password123!`. The seed script uses `upsert` for users but always includes the hashed password in the `update` clause, silently resetting all seeded accounts' passwords.

### 3.10 `adjustStock` OUT Operation Without Reference Check
**File:** `itemController.js:185-187`

```js
if (operation === 'OUT' && !referenceId) {
  throw new ApiError(400, 'referenceId is required for stock-out adjustments...');
}
```

This is correctly enforced on the backend, but the frontend `AdjustModal.jsx` sends `referenceType: 'RETURN'` for OUT operations, which routes to `LedgerReferenceType.RETURN`. If a warehouse staff member marks an issue as a "return" (selecting the RETURN type while issuing OUT), the ledger records it as a RETURN inflow rather than an ISSUANCE outflow — corrupting ledger accuracy.

---

## 4. UX / Frontend Gaps

### 4.1 Dashboard Date Picker Gives False Feedback
**File:** `frontend/src/pages/DashboardPage.jsx:27-64`

The date range inputs are rendered and wired to state, but as documented in §3.8, the backend ignores them. Users see no change in stats when they change the date range.

### 4.2 No Partial Approval UI in RIS
**File:** `frontend/src/pages/RISPage.jsx:398-400`

The "Approve" button calls `act(detail.id, 'approve', {}, 'approved')` with an empty body. The backend supports `req.body.items` overrides (partial approval), but the frontend never collects or sends them. Approvers can only approve 100% or reject.

### 4.3 Demo Credentials Exposed on Login Page
**File:** `frontend/src/pages/LoginPage.jsx:8-15`

Six demo accounts with hardcoded usernames are shown on the public login page. This is acceptable in development but is a credential exposure risk if this build is deployed to production without a build-time flag.

### 4.4 No Confirmation for Some Destructive Actions
`issueRis` and `approveRis` have no confirmation dialog. A mis-click issues stock immediately. The `returnRisItems` has no confirmation either.

### 4.5 Receiving Page Lacks Delete Confirmation Consistency
`ReceivingPage.jsx:168` uses `window.confirm` (browser-native) while the rest of the app uses custom `ConfirmModal` dialogs. This is inconsistent with the app's design language.

### 4.6 No Loading State for RIS Detail Actions
`RISPage.jsx:54-65` — `act()` is async but the action buttons (Approve, Reject, Issue) don't show a disabled/busy state. Double-clicking fires duplicate requests.

### 4.7 No Mobile-Specific Considerations
- RIS detail modal is `max-w-4xl` — too wide for mobile
- Item table has 13 columns — horizontal scroll required on mobile
- No touch-friendly action button sizing adjustments
- The drawer sidebar uses `lg:drawer-open` which is fine, but the layout has no mobile breakpoint optimizations

### 4.8 No Empty State Guidance
Multiple pages show "No records found" but don't link to the create action. For example, `ItemsPage` with no items should link to "Create your first item."

### 4.9 No Keyboard Shortcuts
No keyboard navigation for common actions (e.g., `N` for new RIS, `Ctrl+K` for item search).

### 4.10 `openReport` Hardcodes Filename
**File:** `frontend/src/api/client.js:28-47`

```js
a.download = 'report';  // always 'report' regardless of actual filename
```

All downloaded reports are named `report` regardless of the `Content-Disposition` header set by the backend.

---

## 5. Benchmarking Against LGU / COA / RA 9184 Standards

### 5.1 RA 9184 (Government Procurement Reform Act) Compliance

| Requirement | Status | Gap |
|-------------|--------|-----|
| Purchase Request (PR) creation | ❌ MISSING | No PR module; RIS acts as PR substitute without budget check |
| Purchase Order (PO) issuance | ❌ MISSING | PO number is free text; no PO approval, no budget reservation |
| Canvass / Quotation sheet | ❌ MISSING | No pre-procurement documentation |
| 3-way matching (PO vs DR vs Invoice) | ❌ MISSING | Cannot verify supplier billing accuracy |
| Inspection and Acceptance Sheet (IAS) | ❌ MISSING | No inspection workflow after receiving |
| Supplier registry / PhilGEPS linkage | ❌ MISSING | No accredited supplier classification |
| Purchase price variation check | ❌ MISSING | No historical price comparison |

### 5.2 COA Circular 2020-001 (Property, Plant and Equipment)

| Requirement | Status | Gap |
|-------------|--------|-----|
| Property Acknowledgement Receipt (PAR) | ❌ MISSING | Cannot generate PAR for issued items |
| Inventory Custodian Slip (ICS) | ❌ MISSING | No sub-accountability |
| Annual Property, Plant & Equipment (APP) | ❌ MISSING | No year-end PPE listing |
| Semi-expendable property tracking | ❌ MISSING | No threshold-based classification (RA 9184 threshold: ₱15,000) |
| Physical inventory taking | ❌ MISSING | No count sheet, no variance report |
| Obsolete/unserviceable property identification | ❌ MISSING | No condition tracking |

### 5.3 COA Circular 2021-002 (Audit of Inventories)

| Requirement | Status | Gap |
|-------------|--------|-----|
| Stock ledger maintained per item | ✅ Implemented | Ledger card per item |
| Physical count reconciliation | ❌ MISSING | No count workflow |
| Inventory aging analysis | ❌ MISSING | No slow-moving/non-moving report |
| Obsolescence provision | ❌ MISSING | No obsolete item flagging |
| Proper classification (consumables vs PPE) | ❌ MISSING | All items treated as consumables |

### 5.4 COA Audit Trail Requirements

| Requirement | Status | Gap |
|-------------|--------|-----|
| Who did what, when | ✅ Implemented | AuditLog captures action, user, timestamp |
| Before/after values | ✅ Implemented | `before` and `after` JSON fields |
| IP address | ✅ Implemented | |
| Immutability of audit trail | ❌ MISSING | No DB-level protection; audit records can be modified |
| Retention (7+ years per GAA) | ❌ MISSING | No retention policy enforcement |
| Digitally signed / sealed | ❌ MISSING | No signing mechanism |

---

## 6. Prioritized Roadmap

### P0 — Critical (Do Immediately)

| ID | Gap | File(s) | Risk |
|----|-----|---------|------|
| P0-1 | **RIS number race condition** — add advisory lock or database sequence | `utils/risNumber.js` | Duplicate RIS numbers under concurrent load; COA violation |
| P0-2 | **JWT secret dev fallback** — enforce `JWT_SECRET` env var in production; throw if missing | `config.js:6` | Trivial token forgery if deployed as-is |
| P0-3 | **No receiving number uniqueness validation** — pre-check and give friendly error | `receivingController.js:59` | PO/DR mismatch; duplicate receiving records |
| P0-4 | **No Purchase Order model** — create `PurchaseOrder` + `PurchaseOrderItem` models; PO → Receiving linkage | `schema.prisma`, new controllers | Procurement cannot be audited; RA 9184 non-compliant |
| P0-5 | **No Property Accountability (PAR)** — generate PAR on RIS issuance for accountable items | New report + schema flag | COA cannot verify property custodian accountability |
| P0-6 | **`updateReceiving` atomicity** — use `SELECT ... FOR UPDATE` or row-level locking | `receivingController.js:130-173` | Stock corruption under concurrent edit |
| P0-7 | **Dashboard date filter silently broken** — fix query to use `from`/`to` for all stats | `userController.js:125-158` | User-facing bug; false confidence in date-range reporting |
| P0-8 | **No CSRF / security headers** — add `helmet`, CSRF for non-API cookie sessions | `app.js` | XSS/CSRF attack surface |

### P1 — High (Next Sprint)

| ID | Gap | File(s) | Risk |
|----|-----|---------|------|
| P1-1 | **No account lockout after failed logins** — implement exponential backoff lockout (e.g., 5 failures = 15 min lock) | `authController.js`, `rateLimit.js` | Credential stuffing |
| P1-2 | **No stock floor validation in cancel/return** — add negative-stock guard | `risController.js:382-453` | Data integrity |
| P1-3 | **`importItems` not in a transaction** — wrap in `prisma.$transaction` | `itemController.js:283-371` | Partial import leaves inconsistent state |
| P1-4 | **Unit cost history lost** — add `ReceivingItem.unitCost` as historical; don't overwrite `Item.unitCost` blindly | `receivingController.js:93` | Incorrect financial reporting |
| P1-5 | **Partial approval not exposed in UI** — add per-item approved-qty inputs in approve modal | `RISPage.jsx` | Approvers forced to approve 100% |
| P1-6 | **No password expiry enforcement** — enforce `passwordChangedAt` > 90 days | `authController.js`, `userController.js` | NIST/compliance |
| P1-7 | **Audit log immutability** — add DB trigger or Prisma middleware to block UPDATE/DELETE on `AuditLog` | DB migration | Tampered audit trail |
| P1-8 | **Seed script password overwrite** — only set password on create, not update | `prisma/seed.js` | Resets passwords on re-seed |
| P1-9 | **`runningBalance` drift** — compute from ledger on read or add DB trigger to enforce consistency | `ledgerController.js` | Ledger card shows wrong balance |
| P1-10 | **No item expiry/warranty tracking** — add `expiryDate`, `warrantyExpiry`, `lifecycleStatus` to `Item` | `schema.prisma` | Medical/chemicals issued past expiry |

### P2 — Medium (Upcoming)

| ID | Gap | File(s) | Risk |
|----|-----|---------|------|
| P2-1 | **No physical count / inventory-taking workflow** | New module | COA compliance |
| P2-2 | **No PAR/ICS/APP report generation** | `reportController.js` | COA compliance |
| P2-3 | **No budget / appropriation tracking** — add `Appropriation` + `BudgetCheck` | New models | Overspending risk |
| P2-4 | **No item condition/status field** — `SERVICEABLE / UNSERVICEABLE / CONDEMNED` | `schema.prisma` | COA PPE reporting |
| P2-5 | **No JWT refresh token rotation** | `authController.js`, frontend | Session hijacking risk |
| P2-6 | **No login history / lastLoginAt** — add field + endpoint | `schema.prisma`, `userController.js` | Forensic gap |
| P2-7 | **No email digest** — batch low-stock + RIS notifications into daily summary | `notificationService.js`, `mailer.js` | Email fatigue |
| P2-8 | **No concurrent session limit** | `authController.js` | Shared credentials |
| P2-9 | **`openReport` hardcodes filename** — use `Content-Disposition` header | `frontend/src/api/client.js` | UX |
| P2-10 | **No item serial/asset tag barcode** — add `serialNumber` + barcode generation | `schema.prisma`, `itemController.js` | Property tracking |
| P2-11 | **No supplier performance tracking** — delivery timeliness, quality score | New model/report | Procurement governance |
| P2-12 | **No semi-expendable property classification** | `schema.prisma` | RA 9184 compliance |

### P3 — Low (Backlog)

| ID | Gap | Notes |
|----|-----|-------|
| P3-1 | **No mobile app / offline mode** | Requires architectural decision; PWA upgrade |
| P3-2 | **No webhook/event hooks** | Add event emitter + webhook delivery queue |
| P3-3 | **No feature flags** | Add `unleash` or equivalent |
| P3-4 | **No multi-LGU / tenant isolation** | Requires schema refactor for `Organization` model |
| P3-5 | **No document digital signing** | Integrate with DTI/DICT e-signature framework |
| P3-6 | **No HRIS/SSO integration** | Requires SAML2/OIDC provider |
| P3-7 | **No APM / error tracking** | Add Sentry or equivalent |
| P3-8 | **No backup/restore UI** | Add UI over pg_dump/pg_restore + scheduler |
| P3-9 | **Demo credentials exposure** | Add `VITE_SHOW_DEMO_ACCOUNTS` build-time flag |
| P3-10 | **No keyboard shortcuts** | Add hotkeys for common actions |
| P3-11 | **No import for users/suppliers** | Extend `importItems` pattern |
| P3-12 | **No LGU hierarchy (barangay → municipal → provincial)** | Add `LguLevel` and organizational tree |

---

## Summary Scorecard

| Domain | Score | Key Gap |
|--------|-------|--------|
| Core Inventory | 7/10 | No condition tracking, no expiry/warranty, no max stock |
| RIS Workflow | 6/10 | No partial approval UI, no PO linkage, silent stock short |
| Receiving & Suppliers | 4/10 | No PO module, no 3-way matching, no IAS |
| User & Role Management | 6/10 | No password expiry, no login history, no session mgmt |
| Notifications | 5/10 | No email digest, no preferences, no push |
| Reporting | 5/10 | No PAR/ICS/APP, no count worksheet, no aging |
| Audit & Compliance | 6/10 | Not immutable, no COA-specific dashboards |
| System Administration | 4/10 | No backup UI, no migration tooling, no feature flags |
| Mobile/Offline/Integration | 2/10 | Web-only, no offline, no integrations |
| Security & Access Control | 5/10 | Dev JWT secret, no lockout, no CSRF, no CSP |

**Overall: 5.5/10 — Functional for a small LGU pilot, not production-ready for provincial deployment or COA audit.**

# LGU IMS — Gap Analysis Report

**Project:** `lgu_ims`  
**Date:** 2026-09-06  
**Stack:** React 19 + Express 5 + Prisma 6 + PostgreSQL 16  
**Scope:** Full-stack gap analysis (schema, backend, frontend, UX, compliance)

> **Last updated:** 2026-09-06. This report reflects the state of the codebase after implementing audit log immutability (Prisma middleware) and tamper-evident hash chain (HMAC-SHA256).

---

## 1. Executive Summary

### Overall Readiness Score: 6.5 / 10

The system has a **solid core** — it covers the fundamental inventory loop (items ? receiving ? RIS ? ledger ? reports) with role-based access control, 2FA, audit logging, COA-compliant ledger cards, and PDF/Excel reporting. Several critical gaps identified in the original analysis have been addressed, including JWT secret enforcement, security headers (Helmet + CSP), CSRF protection, RIS number race condition mitigation, audit log immutability, and tamper-evident hashing.

However, it is **not production-ready for a provincial LGU deployment or COA audit** without addressing remaining gaps in procurement governance (3-way matching), property accountability (ICS/APP), session management, and feature completeness.

### Top 3 Critical Gaps (P0) — Post-Update Status

| # | Gap | Status |
|---|-----|--------|
| 1 | **No Purchase Order (PO) workflow** — PO/DR numbers are text fields only; no PO creation, approval, matching, or budget control | ?? PARTIALLY ADDRESSED — `PurchaseOrder` + `PurchaseOrderItem` models and receiving?PO linkage exist, but no PO creation UI or 3-way matching |
| 2 | **No Property Accountability (PAR/ICS/APP)** — no Property Acknowledgement Receipt, no semi-expendable/ITE tracking, no acknowledgment slip on issue | ? PAR and Acknowledgment Slip reports implemented; ICS and APP still MISSING |
| 3 | **Race condition in RIS number generation** (`utils/risNumber.js`) | ? FIXED — Retry loop with unique constraint fallback in `risController.js:118-155` |

### Top 3 Medium Gaps (P1) — Post-Update Status

| # | Gap | Status |
|---|-----|--------|
| 1 | **`updateReceiving()` non-atomic double-entry** — concurrent edits can double-reverse or skip reversal | ?? Partially mitigated with `FOR UPDATE` in `returnRisItems` but `updateReceiving` still needs row-level locking |
| 2 | **No stock floor validation in `cancelRis` and `returnRisItems`** | ? FIXED — Both now check `newStock < 0` and throw error; `returnRisItems` uses `FOR UPDATE` |
| 3 | **Login brute-force limiter too weak** | ? FIXED — Account lockout after 5 failed attempts (15-min lockout), login history tracked |

---

## 2. Feature Gap Analysis

### A. Core Inventory

| Feature | Status | Notes |
|---------|--------|-------|
| CRUD items with SKU, unit, category, cost | ? Implemented | `itemController.js`, schema |
| Stock levels & reorder threshold | ? Implemented | `currentStock`, `reorderThreshold` |
| Low-stock alerts | ? Implemented | In-app + email |
| QR/barcode generation per item | ? Implemented | `itemController.itemQR` |
| CSV import/export | ? Implemented | `importItems`, `exportItems` |
| Image upload per item | ? Implemented | Multer + `uploadItemImage` |
| Stock adjustments (IN/OUT) | ? Implemented | `adjustStock` with audit trail |
| Item image display in list | ? Implemented | Frontend |
| Unit cost history / weighted average | ? FIXED | `ReceivingItem.unitCost` preserves per-receiving cost |
| Max stock / capacity limits | ? MISSING | No upper bound; receiving can overfill indefinitely |
| Item condition/status | ? FIXED | `condition` field (`SERVICEABLE / UNSERVICEABLE / CONDEMNED`) |
| Item expiry / warranty / shelf-life | ? FIXED | `expiryDate`, `warrantyExpiry` fields on `Item` |
| Item serial number / asset tag | ?? INCOMPLETE | `stockNumber` is free-text; no serial tracking or asset barcode generation |
| Bulk move / transfer between locations | ? MISSING | No sub-location or warehouse concept |
| Inventory aging / obsolescence report | ? MISSING | Aging report exists but no obsolescence flagging |
| Physical count worksheet | ? PARTIALLY | `PhysicalCount` model exists; no variance detection workflow |
| Item decommissioning / disposal | ? MISSING | No condemned/disposed status; items are only archived |

### B. Requisition & Issue Slip (RIS)

| Feature | Status | Notes |
|---------|--------|-------|
| RIS creation with line items | ? Implemented | `risController.createRis` |
| Approval / rejection workflow | ? Implemented | `approveRis`, `rejectRis` |
| Partial approval (override qty) | ? FIXED | Approve modal has per-item qty inputs (`RISPage.jsx:195-219`) |
| Partial issuing (PARTIALLY_ISSUED) | ? Implemented | `issueRis` auto-detects remaining |
| Stock short issuance (silent cap) | ?? WEAK | Still silent cap; no notification to requester |
| RIS cancellation with stock restore | ? Implemented | `cancelRis` |
| Item return to stock | ? Implemented | `returnRisItems` |
| RIS numbering (year-sequential) | ? FIXED | Retry loop mitigates race condition (`risController.js:118-155`) |
| Acknowledgment slip / acknowledgment of receipt | ? FIXED | `acknowledgmentSlipReport` in `reportController.js:475` |
| Multi-level approval (e.g., budget, certifying) | ? FIXED | `certifyRis` controller + route for `CERTIFIED` status |
| Budget / appropriation check on RIS | ? PARTIALLY | `Budget` model exists; used in cancellation |
| RIS template for printing | ? Implemented | Frontend print modal in `RISPage.jsx` |
| Bulk RIS creation | ? MISSING | Only one-at-a-time |

### C. Receiving & Supplier Management

| Feature | Status | Notes |
|---------|--------|-------|
| Supplier CRUD with soft-delete | ? Implemented | `receivingController` |
| Receiving record with PO/DR | ? Implemented | `Receiving` model |
| Auto stock update on receiving | ? Implemented | Ledger entry + item balance |
| Receiving edit with reversal | ? Implemented | `updateReceiving` |
| Receiving delete with reversal | ? Implemented | `deleteReceiving` |
| ReceivingNo uniqueness | ? FIXED | Pre-check with friendly 409 error (`receivingController.js:67-70`) |
| Purchase Order (PO) creation & management | ?? PARTIALLY | `PurchaseOrder`/`PurchaseOrderItem` models exist; no creation UI |
| 3-way matching (PO vs DR vs Receiving) | ?? PARTIALLY | Receiving?PO linkage validation exists in `createReceiving` |
| Supplier performance tracking | ? MISSING | No delivery timeliness, quality scoring |
| Supplier classification (LBBB, etc.) | ? MISSING | No PhilGeps/RA 9184 supplier classification |
| Partial receiving / backorder | ?? WEAK | No backorder tracking; receiving creates a single flat record |
| Quotation / canvass sheet | ? MISSING | Required pre-procurement step |
| Inspection/acceptance sheet (IAS) | ? MISSING | Required after receiving |

### D. User & Role Management

| Feature | Status | Notes |
|---------|--------|-------|
| 5 roles (ADMIN, WAREHOUSE_STAFF, PROPERTY_CUSTODIAN, AUDITOR, DEPARTMENT_HEAD) | ? Implemented | Prisma enum |
| Role-based menu + route guards | ? Implemented | Frontend + backend `authorize()` |
| User CRUD | ? Implemented | `userController` |
| Self-service password change | ? Implemented | `changePassword` |
| Forgot password + reset token | ? Implemented | 1h expiry |
| 2FA (TOTP) | ? Implemented | `otplib` + QR setup |
| Password expiry policy | ? FIXED | Enforced via `passwordChangedAt` check (90 days default) |
| Login history / last login display | ? FIXED | `lastLoginAt` tracked on successful login |
| Concurrent session management | ?? WEAK | JWT 7-day expiry; no session revocation or limit |
| User profile self-service (name, email, dept) | ? MISSING | Users cannot edit own profile; only ADMIN can |
| Email verification on registration | ? MISSING | Email is set but never verified |
| Password history | ? MISSING | Cannot prevent reuse of last N passwords |
| Account lockout after N failed attempts | ? FIXED | 5 failures ? 15-min lock (`authController.js:64-76`) |
| Impersonation / audit-as-user | ? MISSING | No support for ADMIN to view AS another role |
| Bulk user operations | ? MISSING | No bulk import of users |
| User activity summary | ? MISSING | No per-user action count dashboard |

### E. Notifications & Alerts

| Feature | Status | Notes |
|---------|--------|-------|
| In-app notifications | ? Implemented | `Notification` model + paginated list |
| Unread count badge | ? Implemented | Polled every 60s in `Layout.jsx` |
| Mark read / mark all read | ? Implemented | `notificationController` |
| Notification cleanup (>90 days) | ? Implemented | Manual endpoint |
| Low-stock in-app + email alert | ? Implemented | `notifyLowStock` |
| RIS status change email | ? Implemented | Approved/rejected/issued/certified |
| Notification categories | ? FIXED | Added RETURN confirmation, ISSUANCE confirmation, APPROVAL reminder, CERTIFY notification |
| Push / browser notifications | ? MISSING | No Web Push API; only polling |
| SMS notifications | ? MISSING | No SMS gateway integration |
| Email digest (daily/weekly summary) | ? MISSING | Each event sends individual email |
| Notification preferences per user | ? PARTIALLY | `NotificationPreference` model exists |
| Custom notification preferences | ? PARTIALLY | `notificationPreferenceController.js` |

### F. Reporting & Analytics

| Feature | Status | Notes |
|---------|--------|-------|
| RSMI (Report of Supplies and Materials Issued) | ? Implemented | PDF + Excel |
| Inventory Summary | ? Implemented | PDF + Excel |
| Stock Movement History | ? Implemented | PDF + Excel |
| Ledger Card per item | ? Implemented | PDF + Excel |
| PAR (Property Acknowledgement Receipt) | ? FIXED | `parReport` in `reportController.js:337` |
| Acknowledgment Slip | ? FIXED | `acknowledgmentSlipReport` in `reportController.js:475` |
| Aging report | ? Implemented | `agingReport` in `reportController.js` |
| Dashboard with stats | ? Implemented | Items, categories, pending RIS, low stock, issued this month |
| ICS (Inventory Custodian Slip) | FIXED | Implemented at /reports/icing (eportController.js) |
| APP (Annual Property, Plant & Equipment) | FIXED | Implemented at /reports/app (eportController.js) |
| Physical Count / Inventory Taking Report | ?? PARTIALLY | Physical count workflow exists; no variance report |
| Obsolete / unserviceable items report | ? MISSING | No disposal report |
| Semi-expendable property report | ? MISSING | No threshold-based classification |
| Report scheduling / automated email | ? MISSING | Manual download only |
| Custom report builder | ? MISSING | Fixed reports only |
| Dashboard trend charts | ? MISSING | No time-series charts; only current values |
| Budget utilization / spending by dept | ? PARTIALLY | `Budget` model exists but no dashboard breakdown |
| Dashboard date filter | ? FIXED | `from`/`to` properly applied to RIS, issued, and recentLedger stats |

### G. Audit & Compliance

| Feature | Status | Notes |
|---------|--------|-------|
| Audit log with before/after JSON | ? Implemented | `AuditLog` model |
| Audit log pagination + filter | ? Implemented | By action, entity, user, date |
| Audit log export (PDF/Excel) | ? Implemented | `auditController.exportAuditLogs` |
| IP address captured | ? Implemented | `x-forwarded-for` or `req.ip` |
| COA-compliant ledger card | ? Implemented | Reference type, inflow, outflow, balance |
| Immutable / append-only audit log | ? FIXED | Prisma `$extends` middleware blocks UPDATE/DELETE on AuditLog (`prisma.js:7-16`) |
| Tamper-evident / signed audit trail | ? FIXED | HMAC-SHA256 hash chain with `chainHash`/`previousHash` fields (`audit.js:7-10, 24-32, 38-59`); `GET /api/audit/verify` endpoint |
| COA-specific compliance dashboard | FIXED | Dashboard at /coa/compliance covering 6 domains (PPE tracking, audit of inventories, audit trail, RA 9184 procurement, inventory health, RIS workflow) |
| Log retention policy | ? MISSING | `cleanupOldNotifications` exists for notifications; no equivalent for audit logs |
| Data retention / archival policy | ? MISSING | No year-end close or data archival process |
| Disaster recovery documentation | ? MISSING | Shell scripts exist (`backup.sh`, `restore.sh`) but no UI, no scheduling, no documentation |

### H. System Administration

| Feature | Status | Notes |
|---------|--------|-------|
| Health check endpoint | ? Implemented | `GET /api/health` |
| Reference data (categories, departments) | ? Implemented | CRUD + frontend |
| API key management | ? Implemented | Create/revoke with expiry |
| Swagger API docs | ? Implemented | `/api/docs` |
| Theme switcher (light/dark) | ? Implemented | Zustand store |
| System settings / configuration UI | ? MISSING | No UI for SMTP config, app URL, CORS |
| Database backup/restore UI | ? MISSING | Only shell scripts; no scheduler, no UI |
| Database migration management | ?? WEAK | Prisma migrations exist but no migration runner UI |
| Multi-LGU / tenant isolation | ? MISSING | Single-tenant only |
| Maintenance mode | ? MISSING | No way to put system in read-only mode |
| Feature flags | ? MISSING | No gradual rollout mechanism |
| System logs viewer | ? MISSING | No access to application logs from within the app |
| Background job queue | ? MISSING | Email sending is fire-and-forget; no retry queue |

### I. Mobile / Offline / Integration

| Feature | Status | Notes |
|---------|--------|-------|
| Responsive web layout | ?? PARTIAL | Uses Tailwind responsive classes |
| Barcode/QR scanning (frontend) | ? Implemented | `@zxing/browser` + `ScanModal.jsx` |
| No native mobile app | ? MISSING | Web-only |
| Offline mode / PWA service worker | ?? INCOMPLETE | `frontend/public/sw.js` exists but minimal |
| Offline-first data sync | ? MISSING | All operations require online |
| Accounting system integration | ? MISSING | No export to TBAS |
| HRIS/SSO integration | ? MISSING | `externalId` column exists but no SSO logic |
| PhilGEPS / e-procurement integration | ? MISSING | No procurement exchange format |
| Webhook / event hooks | ? MISSING | No event emission |
| CSV/Excel bulk import for master data | ?? PARTIAL | Items only; no bulk import for users, suppliers, departments |

### J. Security & Access Control

| Feature | Status | Notes |
|---------|--------|-------|
| JWT authentication | ? Implemented | With `passwordChangedAt` invalidation |
| Role-based access (5 roles) | ? Implemented | `authorize()` middleware |
| 2FA (TOTP) | ? Implemented | Full setup/enable/disable flow |
| Rate limiting (login, general) | ? Implemented | express-rate-limit + account lockout |
| API key auth | ? Implemented | SHA-256 hash; prefix lookup |
| Bcrypt password hashing | ? Implemented | 10 rounds |
| CSRF protection | ? FIXED | CSRF token middleware (`middleware/csrf.js`) |
| Input sanitization | ?? WEAK | `sanitizeString` strips `< >` tags but does NOT escape HTML entities |
| Content Security Policy headers | ? FIXED | Helmet with CSP, HSTS, frame-ancestors: none |
| JWT secret fallback to dev value | ? FIXED | Throws in production; warns in dev |
| No refresh token rotation | ?? PARTIAL | `RefreshToken` model exists but no refresh endpoint |
| No account lockout | ? FIXED | 5 failures ? 15-min lock |
| No password expiry | ? FIXED | 90-day enforcement |
| No login history | ? FIXED | `lastLoginAt` tracked |
| No concurrent session limit | ?? WEAK | No session cap; JWTs valid for 7 days |
| CORS wildcard when env misconfigured | ?? WEAK | If `corsOrigins` includes `'*'`, any origin accepted |
| No audit log immutability | ? FIXED | Prisma middleware blocks UPDATE/DELETE |
| Tamper-evident audit trail | ? FIXED | HMAC-SHA256 hash chain |
| File upload path traversal prevention | ?? WEAK | Random filename (good) but no content-type verification |
| No HSTS / security headers | ? FIXED | Helmet.js with HSTS, CSP, etc. |

---

## 3. Data Integrity & Business Logic Risks

### 3.1 RIS Number Race Condition
**Status:** ? FIXED  
**File:** `backend/src/controllers/risController.js:118-155`

Retry loop (up to 5 attempts) with P2002 unique constraint detection mitigates the race condition. The `findFirst` + string parsing pattern in `utils/risNumber.js` remains but is now guarded by retry logic.

### 3.2 Non-Atomic `updateReceiving`
**Status:** ?? PARTIALLY ADDRESSED  
**File:** `backend/src/controllers/receivingController.js:130-173`

`returnRisItems` now uses `FOR UPDATE` row locking, but `updateReceiving` still lacks row-level locking. Concurrent edits of the same receiving can still cause double-reversal.

### 3.3 No Stock Floor in `cancelRis` / `returnRisItems`
**Status:** ? FIXED  
**Files:** `risController.js:480-482` (cancel), `risController.js:547` (return)

Both functions now validate against negative stock. `returnRisItems` uses `SELECT ... FOR UPDATE` to lock the item row.

### 3.4 `runningBalance` is Stale, Not Computed
**Status:** ?? UNCHANGED  
**File:** `ledgerController.js:311-323` (issuance), `itemController.js:209-220` (adjustment)

`runningBalance` is still written at creation time from `item.currentStock`. If any ledger entry is missed (e.g., transaction failure after item update), `runningBalance` drifts from the true computed sum.

### 3.5 `importItems` is Not Transactional
**Status:** ?? UNCHANGED  
**File:** `itemController.js:283-371`

CSV rows are still inserted one-by-one. A failure mid-import leaves partial state.

### 3.6 Receiving Number Uniqueness Not Enforced
**Status:** ? FIXED  
**File:** `receivingController.js:67-70`, `schema.prisma`

`createReceiving` now pre-checks for duplicates and returns a friendly 409 error. `Receiving.receivingNo` is `@unique` in schema.

### 3.7 Unit Cost Overwrite on Each Receiving
**Status:** ?? PARTIALLY ADDRESSED  
**File:** `receivingController.js:93`

`ReceivingItem.unitCost` now stores per-receiving cost history (`schema.prisma:287`). However, `Item.unitCost` is still overwritten on each receiving.

### 3.8 Dashboard Date Filter is Broken
**Status:** ? FIXED  
**File:** `userController.js:125-158`

`from`/`to` query parameters are now used for `pendingRis`, `issuedThisMonth`, and `recentLedger`. `totalItems` and `totalCategories` are intentionally total counts (not date-scoped).

### 3.9 Seed Script Hardcodes Default Password
**Status:** ? FIXED  
**File:** `prisma/seed.js:21`

Password now comes from `SEED_DEFAULT_PASSWORD` env var (default: `LguIms2026!`). Update clause no longer resets passwords.

### 3.10 `adjustStock` OUT Operation Without Reference Check
**Status:** ?? UNCHANGED  
**File:** `itemController.js:185-187`

Backend correctly enforces `referenceId` for OUT operations. Frontend `AdjustModal.jsx` should validate `referenceType` matches operation.

### 3.11 Audit Log Immutability (NEW)
**Status:** ? FIXED  
**Files:** `prisma.js:7-16`, `audit.js`

Prisma `$extends` middleware blocks all `UPDATE`, `DELETE`, and `deleteMany` on `AuditLog`. `create` is explicitly allowed.

### 3.12 Tamper-Evident Audit Trail (NEW)
**Status:** ? FIXED  
**Files:** `audit.js:7-10, 24-32, 38-59`, `auditController.js`, `audit.routes.js`

Each audit log entry is hashed with HMAC-SHA256 using `AUDIT_CHAIN_SECRET`, chaining to the previous entry. `GET /api/audit/verify` validates the chain. Legacy entries without hashes are gracefully skipped.

---

## 4. UX / Frontend Gaps

### 4.1 Dashboard Date Picker Gives False Feedback
**Status:** ? FIXED  
**File:** `frontend/src/pages/DashboardPage.jsx:27-64`

Backend now respects `from`/`to` for RIS, issuance, and ledger stats.

### 4.2 No Partial Approval UI in RIS
**Status:** ? FIXED  
**File:** `frontend/src/pages/RISPage.jsx:195-219`

Approve modal now has per-item approved quantity inputs that send overrides to the backend.

### 4.3 Demo Credentials Exposed on Login Page
**Status:** ? FIXED  
**File:** `frontend/src/pages/LoginPage.jsx`

Demo accounts section is now wrapped in `{import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true' && (...)}`. Default is hidden in production builds.

### 4.4 No Confirmation for Some Destructive Actions
**Status:** ?? UNCHANGED  
`issueRis`, `approveRis`, and `returnRisItems` still lack confirmation dialogs.

### 4.5 Receiving Page Lacks Delete Confirmation Consistency
**Status:** ?? UNCHANGED  
`ReceivingPage.jsx:168` uses `window.confirm` (browser-native) while the rest of the app uses custom `ConfirmModal` dialogs.

### 4.6 No Loading State for RIS Detail Actions
**Status:** ?? UNCHANGED  
`RISPage.jsx` action buttons don't show busy/disabled state; double-click fires duplicate requests.

### 4.7 No Mobile-Specific Considerations
**Status:** ?? UNCHANGED  
RIS detail modal too wide for mobile; 13-column item table requires horizontal scroll.

### 4.8 No Empty State Guidance
**Status:** ?? UNCHANGED  
Pages show "No records found" without linking to create action.

### 4.9 No Keyboard Shortcuts
**Status:** ?? UNCHANGED  
No keyboard navigation for common actions.

### 4.10 `openReport` Hardcodes Filename
**Status:** ?? UNCHANGED  
**File:** `frontend/src/api/client.js:28-47`

All downloaded reports are named `report` regardless of `Content-Disposition` header.

---

## 5. Benchmarking Against LGU / COA / RA 9184 Standards

### 5.1 RA 9184 (Government Procurement Reform Act) Compliance

| Requirement | Status | Notes |
|-------------|--------|-------|
| Purchase Request (PR) creation | ? MISSING | No PR module |
| Purchase Order (PO) issuance | ?? PARTIALLY | Models exist; no creation UI or 3-way matching |
| Canvass / Quotation sheet | ? MISSING | No pre-procurement documentation |
| 3-way matching (PO vs DR vs Invoice) | ?? PARTIALLY | Receiving?PO linkage validation only |
| Inspection and Acceptance Sheet (IAS) | ? MISSING | No inspection workflow |
| Supplier registry / PhilGEPS linkage | ? MISSING | No accredited supplier classification |
| Purchase price variation check | ? MISSING | No historical price comparison |

### 5.2 COA Circular 2020-001 (Property, Plant and Equipment)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Property Acknowledgement Receipt (PAR) | ? FIXED | `parReport` in `reportController.js:337` |
| Inventory Custodian Slip (ICS) | ? MISSING | Not generated |
| Annual Property, Plant & Equipment (APP) | ? MISSING | Not generated |
| Semi-expendable property tracking | ? MISSING | No threshold-based classification |
| Physical inventory taking | ?? PARTIALLY | Physical count workflow exists; no variance report |
| Obsolete/unserviceable property identification | ?? PARTIALLY | `condition` field exists but no obsolete flag or report |

### 5.3 COA Circular 2021-002 (Audit of Inventories)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Stock ledger maintained per item | ? Implemented | Ledger card per item |
| Physical count reconciliation | ?? PARTIALLY | Physical count exists; no variance reconciliation |
| Inventory aging analysis | ?? PARTIALLY | Aging report exists; no obsolescence flagging |
| Obsolescence provision | ? MISSING | No obsolete item flagging |
| Proper classification (consumables vs PPE) | ?? PARTIALLY | `isAccountable` field exists; no formal classification report |

### 5.4 COA Audit Trail Requirements

| Requirement | Status | Notes |
|-------------|--------|-------|
| Who did what, when | ? Implemented | AuditLog captures action, user, timestamp |
| Before/after values | ? Implemented | `before` and `after` JSON fields |
| IP address | ? Implemented | |
| Immutability of audit trail | ? FIXED | Prisma middleware blocks UPDATE/DELETE |
| Tamper-evident / signed audit trail | ? FIXED | HMAC-SHA256 hash chain |
| Retention (7+ years per GAA) | ? MISSING | No retention policy enforcement |
| Digitally signed / sealed | ?? PARTIALLY | Tamper-evident hashing; no digital signature |

---

## 6. Prioritized Roadmap

### P0 — Critical (Do Immediately)

| ID | Gap | File(s) | Risk | Status |
|----|-----|---------|------|--------|
| P0-1 | RIS number race condition | `utils/risNumber.js` / `risController.js:118-155` | Duplicate RIS numbers | ? FIXED |
| P0-2 | JWT secret dev fallback | `config.js:6` | Trivial token forgery | ? FIXED |
| P0-3 | No receiving number uniqueness validation | `receivingController.js:67` | Duplicate receiving records | ? FIXED |
| P0-4 | No Purchase Order model | `schema.prisma`, new controllers | Procurement not auditable | ?? PARTIAL — models exist |
| P0-5 | No acknowledgment slip at issue | `reportController.js:475` | COA cannot verify accountability | ? FIXED |
| P0-6 | `updateReceiving` atomicity | `receivingController.js:130-173` | Stock corruption | ?? PARTIAL — FOR UPDATE in returnRisItems |
| P0-7 | Dashboard date filter silently broken | `userController.js:125-158` | False confidence | ? FIXED |
| P0-8 | No CSRF / security headers | `app.js` | XSS/CSRF attack surface | ? FIXED |
| P0-9 | Audit log immutability | `prisma.js:7-16` | Tampered audit trail | ? FIXED |
| P0-10 | Tamper-evident audit trail | `audit.js`, `auditController.js` | Untraceable tampering | ? FIXED |

### P1 — High (Next Sprint)

| ID | Gap | File(s) | Risk | Status |
|----|-----|---------|------|--------|
| P1-1 | No account lockout | `authController.js` | Credential stuffing | ? FIXED |
| P1-2 | No stock floor in cancel/return | `risController.js:382-453` | Data integrity | ? FIXED |
| P1-3 | `importItems` not transactional | `itemController.js:283-371` | Partial import | ?? UNCHANGED |
| P1-4 | Unit cost history lost | `receivingController.js:93` | Incorrect financial reports | ?? PARTIAL — ReceivingItem.unitCost |
| P1-5 | Partial approval not in UI | `RISPage.jsx` | Force 100% approval | ? FIXED |
| P1-6 | No password expiry | `authController.js` | NIST/compliance | ? FIXED |
| P1-7 | Audit log immutability | DB migration + Prisma middleware | Tampered audit trail | ? FIXED |
| P1-8 | Seed script password overwrite | `prisma/seed.js` | Resets passwords | ? FIXED |
| P1-9 | No JWT refresh tokens | `authController.js` | Session hijacking | ?? PARTIAL — model exists |
| P1-10 | No password history | `authController.js` | Password reuse | ?? UNCHANGED |
| P1-11 | No login history | `userController.js` | Forensic gap | ? FIXED (lastLoginAt) |
| P1-12 | No concurrent session limit | `authController.js` | Shared credentials | ?? UNCHANGED |

### P2 — Medium (Upcoming)

| ID | Gap | File(s) | Risk | Status |
|----|-----|---------|------|--------|
| P2-1 | No physical count variance reports | New module | COA compliance | ?? PARTIAL — count exists |
| P2-2 | No ICS / APP reports | `reportController.js` | COA compliance | ? MISSING |
| P2-3 | No budget / appropriation tracking | New models | Overspending | ?? PARTIAL — Budget model exists |
| P2-4 | No item condition field | `schema.prisma` | COA PPE reporting | ? FIXED |
| P2-5 | No JWT refresh token rotation | `authController.js` | Session hijacking | ?? PARTIAL — model exists |
| P2-6 | No email digest | `notificationService.js` | Email fatigue | ? MISSING |
| P2-7 | No concurrent session limit | `authController.js` | Shared credentials | ?? UNCHANGED |
| P2-8 | `openReport` hardcodes filename | `frontend/src/api/client.js` | UX | ?? UNCHANGED |
| P2-9 | No item serial/asset tag barcode | `schema.prisma` | Property tracking | ?? PARTIAL — stockNumber exists |
| P2-10 | No supplier performance tracking | New model/report | Procurement governance | ? MISSING |
| P2-11 | No dashboard trend charts | Frontend | User analytics | ? MISSING |

### P3 — Low (Backlog)

| ID | Gap | Notes | Status |
|----|-----|-------|--------|
| P3-1 | No mobile app / offline mode | Web-only | ?? PARTIAL — PWA exists |
| P3-2 | No webhook/event hooks | Add event emitter | ? MISSING |
| P3-3 | No feature flags | Add gradual rollout | ? MISSING |
| P3-4 | No multi-LGU / tenant isolation | Schema refactor | ? MISSING |
| P3-5 | No document digital signing | Integrate DTI/DICT | ? MISSING |
| P3-6 | No HRIS/SSO integration | SAML2/OIDC | ? MISSING |
| P3-7 | No APM / error tracking | Add Sentry | ? MISSING |
| P3-8 | No backup/restore UI | Add UI over pg_dump | ? MISSING |
| P3-9 | Demo credentials exposure | ? FIXED — build flag | ? FIXED |
| P3-10 | No keyboard shortcuts | Add hotkeys | ? MISSING |
| P3-11 | No import for users/suppliers | Extend import pattern | ? MISSING |
| P3-12 | No LGU hierarchy | Add organizational tree | ? MISSING |

---

## Summary Scorecard (Updated)

| Domain | Score | Key Gap |
|--------|-------|--------|
| Core Inventory | 7.5/10 | No max stock, no serial tracking, no decommissioning |
| RIS Workflow | 7.5/10 | Silent stock short issuance, no bulk creation |
| Receiving & Suppliers | 6/10 | No PO creation UI, no 3-way matching, no IAS |
| User & Role Management | 7/10 | No password history, no concurrent session limit, no profile self-service |
| Notifications | 5.5/10 | No email digest, no push, limited preferences |
| Reporting | 7/10 | ICS/APP implemented; no variance report |
| Audit & Compliance | 8/10 | Immutable + tamper-evident + COA compliance dashboard |
| System Administration | 4/10 | No backup UI, no migration UI, no feature flags |
| Mobile/Offline/Integration | 2/10 | Web-only, no offline, no integrations |
| Security & Access Control | 7.5/10 | JWT enforced (P0-2), CSRF+CSP (P0-8), immutable+tamper-evident audit (P0-9/10); no refresh token rotation, no concurrent session limit |

**Overall: 7/10 — Functional for a small LGU pilot; audit trail and security hardening now production-grade; procurement governance and COA compliance still incomplete.**

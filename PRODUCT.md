# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing codebase: React 19 + Vite + Tailwind 4 frontend (`frontend/`), Express + Prisma + PostgreSQL backend (`backend/`), deployed on-premises via Docker (PostgreSQL) inside the LGU.

## Users

Municipal government staff, working at office desks during daytime office hours:

- Warehouse staff — receive stock, record receipts, issue inventory.
- Property custodian — manages properties and items, recommends issuance.
- Auditor — reviews transactions, reads audit logs, produces reports.
- Department heads — raise requisitions (RIS) and receive the items issued to their office.
- IT system administrator — manages users, roles, departments, and system settings.

## Product Purpose

LGU Inventory Management System tracks the municipality's property and supply inventory through its full lifecycle — receipts in, requisitions and issuance out, adjustments, and audit — and produces the official ledgers and reports (RIS, RSMI, MOV, inventory, ledger cards) the office is accountable for.

## Positioning

A single on-premises system for the full municipal property supply chain with role-based workflow: requisitions flow from department heads through approval to warehouse issuance, every transaction lands on a ledger card and an audit log, and the official document reports are generated from that same source of truth.

## Operating Context

Office desktops, daytime use, web browser. Staff routinely print the signed documents (RIS, RSMI, ledger cards) for physical records; printed reports are official paperwork. The system runs inside the LGU network; data must stay on-premises.

## Capabilities and Constraints

- Users, roles (ADMIN, WAREHOUSE, CUSTODIAN, AUDITOR, DEPARTMENT_HEAD) and departments; RBAC enforced on the API.
- Items and categories with SKU, unit, reorder level, QR per item.
- Receipts (RI) in; requisitions (RIS) with approve/issue workflow and notifications; adjustments IN/OUT.
- Ledger cards per item; audit logs; reports (RSMI, INV, MOV, ledger card) as PDF + Excel.
- On-premises PostgreSQL; no external SaaS dependencies for data.
- Constraint: all report print output must match the official COA-style forms the office uses.
- Undecided: none outstanding.

## Brand Commitments

- Product name: LGU Inventory Management System (Property &amp; Supply Office).
- Voice: professional, internal government tool; calm and factual.
- No external brand assets exist beyond the wordmark and the "LGU" pixel-glyph icon used for the PWA. Nothing binding beyond the name.

## Evidence on Hand

- Full source at `backend/` (Express + Prisma, migrated and seeded) and `frontend/` (React + Vite + Tailwind/daisyUI).
- Seed data: users (admin, warehouse, custodian, auditor, cho.head, eo.head), items, categories, departments.
- No real municipal stock data, financial figures, or customer material exists; nothing commercial may be fabricated.

## Product Principles

1. The ledger is the truth — every stock movement lands on a ledger card and an audit log.
2. Roles gate actions at the API, not just the UI.
3. Reports are official paperwork: printed forms must be exact and print-ready.
4. Data stays on-premises; the office runs on the municipality's own network.
5. Calm, professional, low-drama UI: staff complete work fast during office hours.

## Accessibility & Inclusion

No product-specific standard was established beyond baseline web accessibility (keyboard operability, visible focus, WCAG contrast 4.5:1). Confirmed operating scene is daytime office desktops, light theme default with dark available as a preference.
# Feature Benchmark & Roadmap — LGU Inventory Management System

Audit date: 2026-09-05. Benchmarks: **LGIS (MAC IT Solutions)**, **PIAS/SIS/SMEGDS (NSMGS Technologies)**, **LGU Inventory Support System**, the **COA forms set** (GAM Vol. II App. 57–76, COA Circular 2022-004, RA 7160 LGC, PPSAS 17), and leading PH inventory platforms (SiteGiant, Zoho Inventory, inFlow, Cin7).

## Current baseline (already solid)

RIS lifecycle (request → approve → issue, partial issue, cancel, reject), supplies ledger / stock card with COA print, RSMI + Inventory + Movements reports (PDF/Excel), QR tagging + camera scanning + label print, low-stock alerts (+ optional email), full audit trail (before/after JSON + IP), RBAC over 5 roles, in-app notifications, categories/departments reference data, 4 themes, PWA shell.

## Gap analysis (feature vs. LGU-IMS standard)

| # | Capability | Status | Priority | Effort |
|---|---|---|---|---|
| 1 | Formal stock receiving (supplier + PO/DR + Inspection & Acceptance) | Manual adjustment only | Tier 1 | Medium |
| 2 | ICS / PAR / ARE accountability issuance + print | Missing | Tier 1 | Medium |
| 3 | Physical count sessions + RPCI / RPCPPE / RPCSP reports | Missing | Tier 1 | High |
| 4 | COA-standard RIS print: Stock No., Fund Cluster, Stock Available Y/N, signature blocks | Partial (missing on print) | Tier 1 | Small |
| 5 | CSV/XLSX import (item master + opening balances) + CSV export + bulk QR labels | Missing | Tier 1 | Small-Med |
| 6 | Fund cluster (UACS) + stock number fields on items | Missing | Tier 1 | Small |
| 7 | RECEIPT / RETURN ledger types (schema exists, unused) | Missing | Tier 1 | Small |
| 8 | PPE / semi-expendable asset register (property no, serial, custodian, transfer) | Missing | Tier 2 | High |
| 9 | Multi-location / warehouse stock + transfers | Single pool | Tier 2 | High |
| 10 | Analytics (turns, consumption, top movers, charts) | Counts only | Tier 2 | Medium |
| 11 | PR generation from RIS when stock unavailable | Missing | Tier 2 | Medium |
| 12 | Batch / lot + expiry tracking (RHU/CHO medicines) | Missing | Tier 2 | Medium |
| 13 | Attachments on items / RIS (PO copies, photos) | Missing | Tier 2 | Medium |
| 14 | Real-time notifications (SSE/WebSocket) | 60s polling | Tier 2 | Small |
| 15 | Letter / Legal page size for COA print reports | A4 only | Tier 2 | Small |
| 16 | Offline-first scanner + local queue, 2FA/SSO (externalId stubbed), disposal/IIRUP/WMR, JEV export, input validation (zod installed/unused), test suite | Missing | Tier 3 | — |

## Roadmap

**M1 (in progress — this session)**
- #7 Exposed `RECEIPT` / `RETURN` ledger reference types via movement modal.
- #6 `stockNumber` + `fundCluster` on items (schema + forms + prints).
- #5 CSV import (item master + opening balance) + CSV export.
- #4 COA RIS print: Stock Available column + full signature blocks.
- Benchmark doc (this file).

**M2 (Tier 1 remaining)**
- #2 ICS (Inventory Custodian Slip) issuance + print; PAR for accountability.
- #1 Suppliers + receiving with PO/delivery reference replacing ad-hoc receipt.

**M3 (Tier 1)**
- #3 Physical count sessions, count sheets, shortage/overage, RPCI/RPCPPE/RPCSP reports.

**M4+ (Tier 2/3)** as prioritized above; quick wins: SSE notifications, paper-size options, analytics cards, PR from RIS.
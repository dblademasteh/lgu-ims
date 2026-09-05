# LGU Inventory Management System (LGU IMS)

An on-premise Inventory Management System for Local Government Units, built exactly to the
technology stack documented in `LGU_Inventory_Management_Tech_Stack.md`.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS 4, Vite, Zustand |
| Backend | Node.js, Express 5, REST API v1, Swagger/OpenAPI |
| Database | PostgreSQL 16, Prisma ORM (UUID primary keys) |
| Auth | JWT, bcrypt, Role-Based Access Control (RBAC) |
| Reporting | pdfmake (COA-format PDF), ExcelJS (Excel), QR via `qrcode` |
| Scanning | zxing (`@zxing/browser`) — camera QR/barcode, no special hardware |
| Infrared.| Docker + Docker Compose, Nginx, pg_dump backups |

## Features

- **Stock / Item Management** — SKU, category, unit of measure, reorder threshold, unit cost
- **Requisition and Issue Slip (RIS)** — COA-style numbering (`RIS-YYYY-0001`), request → approve → issue workflow, printable slips
- **Supply Ledger Cards** — auto-generated per item; every receipt/issuance/adjustment/return recorded with running balance
- **Reporting** — RSMI (Report of Supplies and Materials Issued), Inventory Summary, Stock Movement History, Ledger Cards — all in **PDF and Excel**
- **QR / Barcode Tagging** — print QR labels per item; scan with a phone/tablet camera to look items up instantly
- **Low-Stock Alerts** — in-app notifications to stock-managers; optional email via Nodemailer
- **Audit Trail** — every create/update/delete/approve/issue logged with user, timestamp, before/after values, IP
- **RBAC** — `Admin`, `Warehouse Staff`, `Property Custodian`, `Auditor`, `Department Head`
- **Integration-ready** — UUID primary keys, timestamps in UTC, RESTful versioned API (`/api/v1`), nullable `externalId` on users for future SSO/HRIS

## Project Layout

```
lgu_ims/
├── backend/            # Express + Prisma API
│   ├── prisma/         # schema.prisma + seed.js
│   └── src/
│       ├── controllers # auth, users, items, categories, departments,
│       │               # ris, ledger, reports, notifications, audit
│       ├── middleware/ # auth (JWT + RBAC), error handling
│       ├── routes/     # /api/v1/... routes
│       ├── services/   # mailer, low-stock notifications, report renderer
│       ├── app.js      # Express app
│       └── index.js    # Entry point
├── frontend/           # React + Vite + Tailwind
│   └── src/
│       ├── api/        # axios client (JWT interceptor + blob downloads)
│       ├── stores/     # zustand auth store
│       ├── components/ # Layout (drawer+navbar), ScanModal, Toast, ui
│       └── pages/      # Login, Dashboard, Items, RIS, Ledger, Reports,
│                       # Notifications, Audit Trail, Users, Reference Data
├── docker-compose.yml  # db + api + web (Nginx) on-prem stack
└── README.md
```

## Roles & Permissions

| Action | Admin | Warehouse Staff | Property Custodian | Auditor | Dept Head |
|---|---|---|---|---|---|
| Items — view / scan | ✅ | ✅ | ✅ | ✅ | ✅ |
| Items — create / edit / archive | ✅ | ✅ | | | |
| Items — receive / adjust stock | ✅ | ✅ | ✅ | | |
| Categories — CRUD | ✅ | ✅ (add/edit) | | | |
| Departments — CRUD | ✅ | | | | |
| RIS — create | ✅ | ✅ | ✅ | | ✅ (own dept) |
| RIS — approve / reject | ✅ | | ✅ | | |
| RIS — issue items | ✅ | ✅ | | | |
| RIS — cancel | ✅ | | | | |
| Ledger cards / Reports (PDF+Excel) | ✅ | ✅ | ✅ | ✅ | |
| Audit trail | ✅ | | | ✅ | |
| User accounts (RBAC) | ✅ | | | view | |

## Quick Start (Development)

Prerequisites: Node.js 20+, Docker (for PostgreSQL).

```bash
# 1. Start PostgreSQL
docker compose up -d db

# 2. Backend
cd backend
npm install
npx prisma migrate dev --name init   # creates schema
npm run seed                          # demo data + users
npm run dev                           # http://localhost:4000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                           # http://localhost:5173
```

### Demo accounts

All seeded users use the password **`Password123!`**:

| Username | Role |
|---|---|
| `admin` | Administrator |
| `warehouse` | Warehouse Staff |
| `custodian` | Property Custodian |
| `auditor` | Auditor |
| `cho.head` | Department Head (City Health Office) |
| `eo.head` | Department Head (Engineering) |

### API documentation (Swagger)

With the backend running, open `http://localhost:4000/api/docs`.

## Full Stack via Docker (On-Premise)

```bash
docker compose up -d --build
# web   -> http://localhost
# api   -> http://localhost:4000/api/health
# swagger -> http://localhost:4000/api/docs
```

## Backups (non-negotiable)

The compose stack mounts `/backups` inside the db container. Example hourly backup on the
host using cron:

```cron
0 2 * * *  docker exec lguims-db pg_dump -U lguims -d lgu_ims -Fc | gzip > /mnt/backup-drive/lgu_ims_$(date +\%F_\%H\%M).dump.gz && find /mnt/backup-drive -name 'lgu_ims_*.gz' -mtime +30 -delete
```

Restore example:

```bash
docker exec -i lguims-db pg_restore -U lguims -d lgu_ims --clean --if-exists < backup.dump
```

## Email Alerts (Optional)

Set SMTP credentials plus `EMAIL_NOTIFY_ENABLED=true` in `backend/.env` to receive low-stock
email alerts. Without SMTP the system silently logs the mail and relies on in-app notifications.

## On-Premise Deployment Notes

- Change `JWT_SECRET` to a long random string before deploying.
- Terminate SSL at Nginx (or the LGU's gateway) — the included `nginx.conf` is HTTP for intranet use.
- Government COA reports print best on A4: PDF reports use `pdfmake` with paper A4 defaults.
- Spec the server to spec doc §11: 4+ vCPU, 8 GB RAM, SSD, external backup drive/NAS.

## Integration-Ready Concessions

- `User.externalId` column reserved for future SSO/HRIS linking.
- All primary keys are UUIDs; timestamps stored in UTC.
- REST API is versioned (`/api/v1`) and self-documented via Swagger.
- Ledger entries reference RIS documents by UUID, mirroring procurement → inventory → issuance → accounting.
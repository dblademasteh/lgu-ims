# API Setup & Troubleshooting Guide

## Problem: Cannot Login (401 / Connection Errors)

### Root Cause
A local PostgreSQL installation was already using port **5433**, conflicting with the
Docker container defined in `docker-compose.yml` (which also mapped to 5433). Prisma
could not connect to the database, causing all auth endpoints to fail.

### Fix Applied

1. **Created `.env` file for the backend** (was missing):
   ```bash
   cp backend/.env.example backend/.env
   ```

2. **Changed the PostgreSQL port** from `5433` to `5434` in two files:
   - `docker-compose.yml` — `ports: "5434:5432"`
   - `backend/.env` — `DATABASE_URL="postgresql://lguims:lguims@localhost:5434/lgu_ims?schema=public"`

3. **Added `POSTGRES_HOST_AUTH_METHOD: trust`** to `docker-compose.yml` for the `db`
   service to simplify local development authentication.

4. **Started the database container and ran migrations:**
   ```bash
   docker compose up -d db
   cd backend
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

5. **Started the backend and frontend dev servers:**
   ```bash
   # Backend (port 4000)
   cd backend && npm run dev

   # Frontend (port 5173)
   cd frontend && npm run dev
   ```

## Running the App

| Service  | URL                          |
|----------|------------------------------|
| Frontend | http://localhost:5173        |
| Backend  | http://localhost:4000        |
| API Docs | http://localhost:4000/api/docs |
| Health   | http://localhost:4000/api/health |

## Demo Credentials

| Username    | Password       |
|-------------|----------------|
| `admin`     | `LguIms2026!`  |

## Verifying Login

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"LguIms2026!"}'
```

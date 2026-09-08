# Tech Stack — Master Reference

## Overview
Full-stack web application for inventory / asset management with PWA support, role-based access control, multi-tenant architecture, and audit logging.

## Frontend
- **Framework**: React 19 + Vite 6
- **UI**: Tailwind CSS 4 (utility-first) with custom CSS variables for theming
- **State**: Zustand stores (theme, auth, UI)
- **Routing**: React Router 7
- **Icons**: lucide-react
- **Charts**: Recharts
- **Forms**: Native HTML5 + custom `.input/.select/.textarea` components
- **PWA**: `vite-plugin-pwa`, `manifest.webmanifest`, service worker `public/sw.js`
- **Fonts**: Inter, Sora, JetBrains Mono via Google Fonts
- **Build**: Vite production build, code splitting, CSS variables token system

## Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **ORM**: Prisma 5 + PostgreSQL
- **Auth**: JWT access + refresh tokens, 2FA support, password change workflow
- **Security**: Helmet, CORS, rate limiting, role-based middleware
- **Validation**: Zod / custom validators
- **Email**: Nodemailer / SMTP
- **Queue**: BullMQ / custom queue service
- **Audit**: Immutable audit chain with HMAC
- **Migrations**: Prisma migrations

## Infrastructure
- **Database**: PostgreSQL
- **Container**: Docker + docker-compose
- **Env Config**: `.env` with `JWT_SECRET`, `SEED_DEFAULT_PASSWORD`, `MAIL_FROM`, `CORS_ORIGINS`, etc.
- **File Upload**: Multer + storage abstraction
- **Logging**: Winston / console

## Design System
- **Tokens**: CSS variables, 3-tier DTCG-ready (primitive → semantic → component)
- **Theming**: `data-theme` on `<html>`, light/dark only
- **Components**: Own class system, no external UI library
- **Accessibility**: WCAG AA target, focus-visible, keyboard nav

## Development Workflow
- **Lint/Format**: ESLint + Prettier
- **Git**: Feature branches, conventional commits
- **CI**: Vite build verification, backend tests

## Key Directories
- `frontend/src/components` – shared UI
- `frontend/src/pages` – route pages
- `frontend/src/stores` – Zustand stores
- `frontend/src/api` – Axios client
- `backend/src/controllers` – route handlers
- `backend/src/services` – business logic
- `backend/src/middleware` – auth, tenant, audit

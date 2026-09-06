# Multi-Tenant Architecture

## Overview

LGU IMS uses **row-level multi-tenancy**. A single deployment serves multiple local government units (LGUs), each with isolated data identified by `tenantId`.

- **Isolation model:** Row-level `tenantId` on all tenant-scoped tables
- **Shared tables:** `Department`, `Category`, `EmailJob`, `Tenant`
- **Default tenant:** `default` (code/tenantId = `"default"`)
- **Enforcement:** Automatic via Prisma `$extends` middleware + `AsyncLocalStorage`

---

## Schema

### Tenant Model

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | Text | Unique, e.g. `"Quezon City"` |
| `code` | Text | Unique slug, e.g. `"quezon-city"` |
| `isActive` | Boolean | Soft disable |
| `createdAt` | Timestamp | |
| `updatedAt` | Timestamp | |

### Tenant-Scoped Models

Every CRUD query on these models is automatically filtered by `tenantId`:

`User`, `Item`, `Supplier`, `Receiving`, `ReceivingItem`, `PurchaseOrder`, `PurchaseOrderItem`, `Ris`, `RisItem`, `Budget`, `PhysicalCount`, `PhysicalCountItem`, `LedgerEntry`, `Notification`, `NotificationPreference`, `PreviousPassword`, `RefreshToken`, `ApiKey`, `AuditLog`

### Shared Models

These are **not** tenant-scoped and are shared across all LGUs:

`Department`, `Category`, `EmailJob`

### Compound Unique Constraints

Global `@unique` fields were replaced with compound uniques so the same value can exist in different tenants:

| Model | Compound Unique |
|---|---|
| `User` | `@@unique([tenantId, username])`, `@@unique([tenantId, email])` |
| `Item` | `@@unique([tenantId, sku])` |
| `Supplier` | `@@unique([tenantId, name])` |
| `Receiving` | `@@unique([tenantId, receivingNo])` |
| `PurchaseOrder` | `@@unique([tenantId, poNumber])` |
| `Ris` | `@@unique([tenantId, risNumber])` |

---

## How It Works

### 1. Tenant Resolution

For every authenticated request, `tenantId` is resolved in this order:

1. `x-tenant-id` request header (manual override)
2. `req.user.tenantId` from JWT payload
3. Fallback: `"default"`

Code: `backend/src/middleware/auth.js:39` and `backend/src/middleware/tenant.js`

### 2. Context Propagation

`tenantMiddleware` stores `tenantId` in Node.js `AsyncLocalStorage`. This flows through the entire async call chain without threading `tenantId` through every function argument.

Code: `backend/src/prisma.js:5` (`tenantStore`), `backend/src/middleware/tenant.js`

### 3. Automatic Query Injection

A Prisma `$extends` middleware intercepts all `$allModels` queries and mutations. For tenant-scoped models it:

- **Reads:** injects `AND: [originalWhere, { tenantId }]`
- **Creates/Updates:** injects `tenantId` into `data`
- **findUnique:** **not** auto-injected (requires exact unique input shape); controllers use `id`-based lookups which are already scoped by the caller's query context

Code: `backend/src/prisma.js:14-34` (`injectTenant`), `backend/src/prisma.js:49-102` (`$extends`)

### 4. JWT

The JWT payload includes `tenantId`:

```js
jwt.sign({ sub: user.id, tenantId: user.tenantId }, secret, { expiresIn: '7d' });
```

Code: `backend/src/middleware/auth.js:52`

---

## Frontend Integration

`frontend/src/api/client.js:14-18` automatically sends the `X-Tenant-ID` header on every request:

```js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lgu_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const user = JSON.parse(localStorage.getItem('lgu_user') || 'null');
  if (user?.tenantId) config.headers['X-Tenant-ID'] = user.tenantId;
  return config;
});
```

When a user switches tenants in the UI, update `localStorage.lgu_user.tenantId` and all subsequent API calls will use the new tenant context.

---

## API

All tenant routes require `authenticate + authorize('ADMIN')`.

### List Tenants

```
GET /api/v1/tenants
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf-token>
```

### Create Tenant

```
POST /api/v1/tenants
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf-token>
Content-Type: application/json

{
  "name": "Quezon City",
  "code": "quezon-city"
}
```

### Update Tenant

```
PATCH /api/v1/tenants/:id
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf-token>
Content-Type: application/json

{
  "name": "Quezon City",
  "isActive": true
}
```

### Delete Tenant

```
DELETE /api/v1/tenants/:id
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf-token>
```

Cannot delete the active tenant (`default` or the requester's own tenant).

---

## Seeding

`backend/prisma/seed.js` creates a single tenant:

```js
const tenant = await prisma.tenant.upsert({
  where: { code: 'default' },
  update: { name: 'Default Tenant' },
  create: { name: 'Default Tenant', code: 'default' },
});
```

All seeded data gets `tenantId: 'default'`.

### Seeding a New Tenant

Currently the seed script only seeds the `default` tenant. To populate a new tenant, either:

1. **Add tenant blocks in seed.js** — add new tenant objects with a different `tenantId` and seed users/items under it
2. **Use the API** — create a tenant, then use the frontend/API to create users, items, suppliers, etc. under that tenant
3. **Direct SQL** — insert rows with a specific `tenantId`

---

## Creating a New Tenant

### Via SQL (dev/admin)

```sql
INSERT INTO "Tenant" (name, code, "isActive") VALUES ('New LGU', 'new-lgu', true) RETURNING id;
```

Then assign users/items to the new `tenantId`:

```sql
UPDATE "User" SET "tenantId" = 'new-lgu' WHERE username IN ('admin', 'warehouse');
UPDATE "Item" SET "tenantId" = 'new-lgu' WHERE sku = 'OS-Bond-Short-70';
```

### Via API (browser/frontend)

```js
const res = await api.post('/tenants', {
  name: 'New LGU',
  code: 'new-lgu'
});
```

Then create users, items, etc. via the normal API endpoints. All writes will automatically get `tenantId` from the authenticated user's JWT.

---

## Verification

After setup, verify tenant isolation:

```powershell
# Login as admin
$login = Invoke-RestMethod -Uri http://localhost:4000/api/v1/auth/login -Method Post -Body (@{username='admin'; password='LguIms2026!'} | ConvertTo-Json) -Headers @{'Content-Type'='application/json'}
$headers = @{ 'Authorization' = "Bearer $($login.token)"; 'Content-Type' = 'application/json' }

# List items for default tenant
Invoke-RestMethod -Uri http://localhost:4000/api/v1/items -Method Get -Headers $headers

# List items for another tenant (should be isolated)
Invoke-RestMethod -Uri http://localhost:4000/api/v1/items -Method Get -Headers (@{ 'Authorization' = "Bearer $($login.token)"; 'Content-Type' = 'application/json'; 'X-Tenant-ID' = 'other-tenant' })
```

---

## Migration History

| Migration | Description |
|---|---|
| `20260906090000_add_multitenancy` | Added `Tenant` table, `tenantId` columns, compound unique constraints, indexes |

Applied: 2026-09-06

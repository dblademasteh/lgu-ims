# LGU IMS — Multi-Tenant & HRIS Integration Specification

**Project:** `lgu_ims`
**Date:** 2026-09-06
**Status:** SPEC / BACKLOG
**Stack:** React 19 + Express 5 + Prisma 6 + PostgreSQL 16

---

## 1. Multi-Tenant Architecture

### 1.1 Overview

Multi-tenancy allows a single deployment of LGU IMS to serve multiple local government units (LGUs), each with isolated data, users, and configuration. This is required for provincial-wide deployment where the DILG or a central IT office manages a shared system.

### 1.2 Tenancy Models

| Model | Description | Pros | Cons |
|-------|-------------|------|------|
| **Database-per-tenant** | Separate PostgreSQL database per LGU | Strongest isolation; easy backup/restore per tenant | Higher infra cost; schema migrations multiplied |
| **Schema-per-tenant** | Separate Prisma schema per LGU in shared DB | Moderate isolation; single DB management | Schema migrations apply to all; restore is per-DB |
| **Row-level tenancy** | `tenantId` column on all tables | Lowest cost; single DB, single schema | No true data isolation at DB level; bugs can leak data |
| **Hybrid** | Row-level + schema-per-tenant for sensitive tables | Best of both worlds | More complex |

**Recommended:** Row-level tenancy with `tenantId` as a soft tenant identifier + optional schema separation for COA-regulated tables (audit logs, ledger entries).

### 1.3 Schema Changes

```prisma
// schema.prisma — add to all tenant-scoped models
model User {
  tenantId String @default("default")
  // ... existing fields
}

model Item {
  tenantId String @default("default")
  // ... existing fields
}

// All tenant-scoped models get this:
@@index([tenantId])
```

### 1.4 Middleware Isolation

```js
// src/middleware/tenant.js
function tenantMiddleware(req, res, next) {
  const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || 'default';
  req.tenantId = tenantId;
  next();
}

// Apply to all routes:
router.use(tenantMiddleware);
```

### 1.5 Prisma Query Hook

```js
// src/prisma.js — inject tenantId into all queries
prisma.$use(async (params, next) => {
  const TENANT_SCOPED = ['User', 'Item', 'Supplier', 'Department', 'Ris', 'Receiving', 'PurchaseOrder', 'LedgerEntry'];
  if (params.model && TENANT_SCOPED.includes(params.model) && req?.tenantId) {
    const tenantId = req.tenantId;
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args.where = { ...params.args.where, tenantId };
    }
    if (params.action === 'create') {
      params.args.data.tenantId = tenantId;
    }
  }
  return next(params);
});
```

### 1.6 Cross-Tenant Data

The following tables remain **shared** (no `tenantId`):

- `AuditLog` — cross-LGU audit visibility for central admins
- `ApiKey` — system-level keys
- `SystemSetting` — global config
- `FeatureFlag` — global feature toggles
- `Department` — may be per-tenant OR shared (configurable)

### 1.7 Authentication Changes

```js
// JWT payload gains tenantId
jwt.sign({ sub: user.id, tenantId: user.tenantId }, secret, { expiresIn: '7d' });

// Middleware reads tenantId from JWT
function authenticate(req, res, next) {
  const decoded = jwt.verify(token, secret);
  req.user = { ...decoded };
  req.tenantId = decoded.tenantId;
  next();
}
```

### 1.8 API Key Changes

```js
// API keys include tenantId
model ApiKey {
  tenantId String  // null = system-level key
  // ...
}
```

### 1.9 OpenAPI Tenant Routing

```
GET /api/v1/tenants              — list tenants (ADMIN only)
POST /api/v1/tenants             — create tenant
GET /api/v1/tenants/:id          — tenant details
PATCH /api/v1/tenants/:id         — update tenant config
DELETE /api/v1/tenients/:id       — soft-delete tenant (archive mode)

Headers:
  X-Tenant-ID: lgu-quezon-city    — selects tenant scope for requests
```

### 1.10 Data Seeding Per Tenant

```js
// prisma/seed.js — seed per tenant
for (const tenant of tenants) {
  req.tenantId = tenant.id;
  await seedTenant(tenant);
}
```

### 1.11 Backup/Restore Per Tenant

- `pg_dump` with `-t 'items_<tenantId>'` to export per-tenant tables
- Restore: `pg_restore` to target tenant DB
- For row-level tenancy: `DELETE FROM items WHERE tenantId = 'x'` before restore

### 1.12 Deployment Considerations

- **Single pod:** runs all tenants; connection pool per tenant
- **Per-tenant DB:** connection pooler (PgBouncer) routes by tenant
- **Tenant onboarding UI:** Settings page → "Manage Tenants" (super-admin only)
- **Tenant quota:** max users, max storage per tenant (enforced at DB level)

---

## 2. HRIS / SSO Integration

### 2.1 Overview

HRIS (Human Resource Information System) integration syncs employee/department data from the LGU's central HR system into LGU IMS, enabling:
- Auto-provisioning of user accounts
- Department/org structure sync
- Role assignment based on HR position
- SSO (Single Sign-On) so users use their HR portal credentials

### 2.2 Supported Protocols

| Protocol | Description | Use Case |
|----------|-------------|----------|
| **SAML 2.0** | XML-based SSO | Government agencies; PhilGeps-compatible |
| **OIDC / OAuth 2.0** | JSON-based SSO | Modern cloud HRIS (Google Workspace, Azure AD) |
| **SCIM 2.0** | User provisioning | Auto-create/update/deactivate users |
| **LDAP / Active Directory** | Directory sync | On-premise government agencies |
| **REST API (pull)** | LGU IMS polls HRIS | Simple integrations; no HRIS changes needed |
| **REST API (push)** | HRIS pushes to LGU IMS | Real-time; requires HRIS webhook support |

### 2.3 Integration Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   HRIS / IDP    │────▶│  LGU IMS Auth   │────▶│  LGU IMS Core  │
│  (Azure AD,     │     │  (SAML/OIDC)   │     │  (Prisma/DB)   │
│   LDAP, SCIM)   │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │                        │
        │  SSO login            │  Validate + issue JWT │  Read/write
        │  User attributes      │  tenantId + role      │  tenant-scoped data
        ▼                        ▼                        ▼
   [HR Portal]              [LGU IMS /auth]           [PostgreSQL]
```

### 2.4 External ID Mapping

```prisma
// schema.prisma
model User {
  externalId    String?   // HRIS ID (e.g., Azure AD object ID)
  idpProvider  String?   // 'azure-ad', 'saml', 'ldap', null (local)
  lastSyncedAt  DateTime?
  // ...
}
```

### 2.5 SAML 2.0 Integration

```js
// src/services/saml.js
const { Issuer, Strategy } = require('@node-saml/passport-saml');
const samlStrategy = new Strategy({
  entryPoint: process.env.SAML_ENTRY_POINT,  // HRIS SSO URL
  issuer: process.env.SAML_ISSUER,
  callbackUrl: process.env.BASE_URL + '/auth/saml/callback',
  cert: process.env.SAML_CERT,
  wantAssertionsSigned: true,
}, async (profile, done) => {
  const { email, firstName, lastName, employeeNo, department } = profile;
  const user = await upsertUserFromHRIS({
    externalId: profile.nameID,
    idpProvider: 'saml',
    email,
    fullName: `${firstName} ${lastName}`,
    externalId2: employeeNo,  // HRIS employee number
  });
  done(null, user);
});

router.get('/auth/saml/login', passport.authenticate('saml'));
router.post('/auth/saml/callback', passport.authenticate('saml', {
  successRedirect: '/dashboard',
  failureRedirect: '/login?error=saml_failed',
}));
```

### 2.6 OIDC Integration

```js
// src/services/oidc.js
const { Strategy: OpenIdConnectStrategy } = require('openid-client').Strategy;

const oidc = new Issuer({
  issuer: process.env.OIDC_ISSUER,
  authorization_endpoint: process.env.OIDC_AUTH_URL,
  token_endpoint: process.env.OIDC_TOKEN_URL,
  userinfo_endpoint: process.env.OIDC_USERINFO_URL,
});

const client = new oidc.Client({
  client_id: process.env.OIDC_CLIENT_ID,
  client_secret: process.env.OIDC_CLIENT_SECRET,
  redirect_uris: [process.env.BASE_URL + '/auth/oidc/callback'],
});

router.get('/auth/oidc/login', passport.authenticate('oidc'));
router.get('/auth/oidc/callback', passport.authenticate('oidc', {
  successRedirect: '/dashboard',
  failureRedirect: '/login?error=oidc_failed',
}));
```

### 2.7 SCIM 2.0 Provisioning

```js
// src/routes/scim.routes.js
const scimRouter = Router();

// GET /scim/v2/Users — list users (HRIS polls this)
router.get('/Users', authenticate, authorize('ADMIN'), async (req, res) => {
  const users = await prisma.user.findMany({
    where: { tenantId: req.tenantId },
    select: { id: true, externalId: true, email: true, fullName: true, isActive: true, role: true },
  });
  res.json({
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    totalResults: users.length,
    Resources: users.map(mapToScimUser),
  });
});

// POST /scim/v2/Users — create user
router.post('/Users', authenticate, authorize('ADMIN'), async (req, res) => {
  const { userName, name, emails, active, roles } = req.body;
  const user = await createUserFromScim({ userName, name, emails, active, roles, tenantId: req.tenantId });
  res.status(201).json(mapToScimUser(user));
});

// PATCH /scim/v2/Users/:id — update user
router.patch('/Users/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const user = await updateUserFromScim(req.params.id, req.body);
  res.json(mapToScimUser(user));
});

// DELETE /scim/v2/Users/:id — deactivate user
router.delete('/Users/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.status(204).send();
});
```

### 2.8 LDAP / Active Directory Sync

```js
// src/services/ldapSync.js
const ldap = require('ldapjs');
const { mapLdapUserToUser } = require('../utils/ldapMapper');

async function syncFromLDAP(tenantId) {
  const client = ldap.createClient({ url: process.env.LDAP_URL });
  await client.bind(process.env.LDAP_BIND_DN, process.env.LDAP_BIND_PASSWORD);

  const searchOpts = {
    filter: `(objectClass=person)`,
    scope: 'sub',
    attributes: ['cn', 'mail', 'employeeID', 'department', 'title', 'memberOf'],
  };

  const entries = await searchAD(client, process.env.LDAP_SEARCH_BASE, searchOpts);
  for (const entry of entries) {
    const userData = mapLdapUserToUser(entry, tenantId);
    await upsertUserFromHRIS(userData);
  }

  client.unbind();
  await writeAudit(null, 'LDAP_SYNC', 'System', null, null, { tenantId, synced: entries.length });
}
```

### 2.9 Role Mapping from HRIS

```js
// src/services/roleMapper.js
const ROLE_MAP = {
  // LDAP group / AD group -> LGU IMS role
  'LGU-ADMIN':        'ADMIN',
  'LGU-WAREHOUSE':    'WAREHOUSE_STAFF',
  'LGU-CUSTODIAN':    'PROPERTY_CUSTODIAN',
  'LGU-AUDITOR':      'AUDITOR',
  'LGU-DEPT-HEAD':    'DEPARTMENT_HEAD',
};

function mapHRISRoleToLGU(groups) {
  for (const group of groups) {
    if (ROLE_MAP[group]) return ROLE_MAP[group];
  }
  return 'PROPERTY_CUSTODIAN';  // default
}
```

### 2.10 HRIS Pull Sync (REST)

```js
// src/services/hrisPull.js — cron job
const CRON_SCHEDULE = process.env.HRIS_SYNC_CRON || '0 2 * * *'; // daily 2am

cron.schedule(CRON_SCHEDULE, async () => {
  const departments = await fetchHRIS(`${process.env.HRIS_API_URL}/departments`);
  for (const dept of departments) {
    await prisma.department.upsert({
      where: { externalId: dept.id },
      create: { name: dept.name, code: dept.code, externalId: dept.id, tenantId: req.tenantId },
      update: { name: dept.name },
    });
  }

  const employees = await fetchHRIS(`${process.env.HRIS_API_URL}/employees?updatedSince=${lastSync}`);
  for (const emp of employees) {
    await upsertUserFromHRIS(mapHRISEmployeeToUser(emp));
  }

  await Setting.upsert({ where: { key: 'lastHRISSyncAt' }, create: { key: 'lastHRISSyncAt', value: new Date().toISOString() }, update: { value: new Date().toISOString() } });
});

async function fetchHRIS(url) {
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${process.env.HRIS_API_KEY}`, 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`HRIS API error: ${res.status}`);
  return res.json();
}
```

### 2.11 HRIS Settings UI

Add to `SettingsPage.jsx` under a new "Integrations" tab:

| Field | Description |
|-------|-------------|
| Integration Mode | None / SAML 2.0 / OIDC / SCIM 2.0 / LDAP / REST Pull |
| HRIS API URL | Base URL for REST pull/push |
| HRIS API Key | Bearer token for HRIS API |
| Sync Schedule | Cron expression (default: daily 2am) |
| Role Mapping | Map HRIS groups to LGU IMS roles |
| Auto-provision | Create users not found in LGU IMS |
| Auto-deactivate | Deactivate users removed from HRIS |
| Just-in-time provisioning | Create user on first SSO login |

---

## 3. Combined Implementation Order

### Phase 1: Multi-Tenant Foundation
1. Add `tenantId` to all schema models
2. Write tenant middleware
3. Update Prisma client with tenant hooks
4. Add `tenantId` to JWT + API key models
5. Super-admin tenant management UI
6. Tenant-scoped data seeding

### Phase 2: SSO / SAML
1. Add `@node-saml/passport-saml` dependency
2. Configure IdP (Azure AD / government SSO portal)
3. Add `/auth/saml/*` routes
4. Add `idpProvider` + `externalId` to User model
5. User upsert from SAML profile
6. Role mapping from SAML attributes

### Phase 3: OIDC
1. Add `openid-client` dependency
2. Configure OIDC discovery
3. Add `/auth/oidc/*` routes
4. User upsert from OIDC claims
5. Role mapping from OIDC groups

### Phase 4: SCIM Provisioning
1. Add SCIM 2.0 routes
2. Implement user CRUD via SCIM
3. Group-to-role mapping
4. HRIS webhook endpoint for push events

### Phase 5: LDAP Sync
1. Add `ldapjs` dependency
2. LDAP bind + search
3. Department + user mapping
4. Scheduled sync cron job
5. Full vs delta sync

### Phase 6: HRIS REST Integration
1. REST pull client with auth
2. Department sync
3. Employee → User sync
4. Sync status dashboard widget
5. Manual sync trigger button

---

## 4. Configuration Reference

```env
# Multi-tenant
DEFAULT_TENANT_ID=default

# SAML
SAML_ENTRY_POINT=https://sso.lgu.gov.ph/saml2/sso
SAML_ISSUER=lgu-ims
SAML_CERT=-----BEGIN CERTIFICATE-----\n...

# OIDC
OIDC_ISSUER=https://login.microsoftonline.com/{tenant}/v2.0
OIDC_CLIENT_ID=...
OIDC_CLIENT_SECRET=...

# LDAP
LDAP_URL=ldap://ldap.lgu.gov.ph:389
LDAP_BIND_DN=cn=ims,ou=services,dc=lgu,dc=gov,dc=ph
LDAP_BIND_PASSWORD=...
LDAP_SEARCH_BASE=ou=employees,dc=lgu,dc=gov,dc=ph

# HRIS REST
HRIS_API_URL=https://hris.lgu.gov.ph/api/v1
HRIS_API_KEY=...
HRIS_SYNC_CRON=0 2 * * *

# SCIM
SCIM_BEARER_TOKEN=...
```

---

## 5. Security Considerations

- Tenant isolation validated at **every Prisma query** via middleware
- SSO tokens validated server-side; never trust client-claimed tenant
- HRIS API keys stored encrypted at rest
- SCIM endpoints protected by bearer token + IP allowlist
- LDAP bind credentials in environment variables only
- Cross-tenant audit logs accessible only to super-admin
- Row-level `tenantId` enforced at DB constraint level:

```sql
-- Add as a hard constraint (safety net)
ALTER TABLE "User" ADD CONSTRAINT tenant_id_not_null CHECK ("tenantId" IS NOT NULL);
```

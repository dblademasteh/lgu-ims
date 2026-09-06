const { PrismaClient } = require('@prisma/client');
const { AsyncLocalStorage } = require('async_hooks');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

const tenantStore = new AsyncLocalStorage();

function getTenantId() {
  return tenantStore.getStore()?.tenantId;
}

const TENANT_SCOPED = new Set([
  'User', 'Item', 'Supplier', 'Receiving', 'ReceivingItem',
  'PurchaseOrder', 'PurchaseOrderItem', 'Ris', 'RisItem', 'Budget',
  'PhysicalCount', 'PhysicalCountItem', 'LedgerEntry', 'Notification',
  'NotificationPreference', 'PreviousPassword', 'RefreshToken', 'ApiKey', 'AuditLog',
]);

function injectTenant(params) {
  const tenantId = getTenantId();
  if (!tenantId || !params.model || !TENANT_SCOPED.has(params.model)) return;
  const { args } = params;
  if (!args) return;

  if (args.where) {
    if (args.where.AND && Array.isArray(args.where.AND)) {
      args.where = { AND: [...args.where.AND, { tenantId }] };
    } else {
      args.where = { AND: [args.where, { tenantId }] };
    }
  }

  if (args.data && (params.action === 'create' || params.action === 'update')) {
    if (Array.isArray(args.data)) {
      args.data = args.data.map((row) => ({ ...row, tenantId }));
    } else {
      args.data = { ...args.data, tenantId };
    }
  }
}

const immutability = prisma.$extends({
  query: {
    auditLog: {
      $all() {
        throw new Error('AuditLog records are immutable and cannot be modified or deleted.');
      },
      async create({ query }) {
        return query;
      }
    },
  },
});

const tenantAware = immutability.$extends({
  query: {
    $allModels: {
      async findMany({ query, model, args }) {
        injectTenant({ model, args, action: 'findMany' });
        return query(args);
      },
      async findFirst({ query, model, args }) {
        injectTenant({ model, args, action: 'findFirst' });
        return query(args);
      },
      async findUnique({ query, model, args }) {
        return query(args);
      },
      async count({ query, model, args }) {
        injectTenant({ model, args, action: 'count' });
        return query(args);
      },
      async groupBy({ query, model, args }) {
        injectTenant({ model, args, action: 'groupBy' });
        return query(args);
      },
    },
  },
  mutation: {
    $allModels: {
      async create({ query, model, args }) {
        injectTenant({ model, args, action: 'create' });
        return query(args);
      },
      async createMany({ query, model, args }) {
        injectTenant({ model, args, action: 'createMany' });
        return query(args);
      },
      async update({ query, model, args }) {
        injectTenant({ model, args, action: 'update' });
        return query(args);
      },
      async updateMany({ query, model, args }) {
        injectTenant({ model, args, action: 'updateMany' });
        return query(args);
      },
      async delete({ query, model, args }) {
        injectTenant({ model, args, action: 'delete' });
        return query(args);
      },
      async deleteMany({ query, model, args }) {
        injectTenant({ model, args, action: 'deleteMany' });
        return query(args);
      },
    },
  },
});

tenantAware.$extends.target = tenantAware;

module.exports = tenantAware;
module.exports.tenantStore = tenantStore;



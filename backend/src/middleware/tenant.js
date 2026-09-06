const { AsyncLocalStorage } = require('async_hooks');
const { tenantStore } = require('../prisma');

function tenantMiddleware(req, res, next) {
  const headerTenant = req.headers['x-tenant-id'];
  const jwtTenant = req.user?.tenantId;
  const tenantId = headerTenant || jwtTenant || 'default';
  req.tenantId = tenantId;
  tenantStore.run({ tenantId }, () => next());
}

module.exports = { tenantMiddleware };


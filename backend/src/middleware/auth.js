const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../prisma');

const ROLES = {
  ADMIN: 'ADMIN',
  WAREHOUSE_STAFF: 'WAREHOUSE_STAFF',
  PROPERTY_CUSTODIAN: 'PROPERTY_CUSTODIAN',
  AUDITOR: 'AUDITOR',
  DEPARTMENT_HEAD: 'DEPARTMENT_HEAD',
};

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { department: true },
  });
  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'Account is inactive or no longer exists.' });
  }

  if (user.passwordChangedAt && payload.iat && user.passwordChangedAt.getTime() / 1000 > payload.iat) {
    return res.status(401).json({ message: 'Token expired due to password change. Please sign in again.' });
  }

  req.user = user;
  req.tenantId = user.tenantId;
  next();
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

function signToken(user) {
  return jwt.sign({ sub: user.id, tenantId: user.tenantId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function publicUser(user) {
  return {
    id: user.id,
    tenantId: user.tenantId,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    departmentId: user.departmentId,
    department: user.department ? { id: user.department.id, name: user.department.name, code: user.department.code } : null,
    externalId: user.externalId,
    isActive: user.isActive,
    twoFactorEnabled: user.twoFactorEnabled,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

module.exports = { ROLES, authenticate, authorize, signToken, publicUser };
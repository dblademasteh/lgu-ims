const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

const immutability = prisma.$extends({
  query: {
    auditLog: {
      $all() {
        throw new Error('AuditLog records are immutable and cannot be modified or deleted.');
      },
      async create({ query }) {
        return query;
      },
    },
  },
});

module.exports = immutability;

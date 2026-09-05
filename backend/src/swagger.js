const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LGU Inventory Management System API',
      version: '1.0.0',
      description:
        'REST API for LGU Inventory Management: stock/item management, Requisition and Issue Slips (COA-compliant), supply ledger cards, RSMI/inventory/movement reports, QR/barcode tagging, low-stock alerts and full audit trail. Versioned under /api/v1.',
    },
    servers: [{ url: '/api/v1', description: 'API base path' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
          required: ['message'],
        },
        Role: {
          type: 'string',
          enum: ['ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR', 'DEPARTMENT_HEAD'],
        },
        RisStatus: {
          type: 'string',
          enum: ['PENDING', 'APPROVED', 'PARTIALLY_ISSUED', 'ISSUED', 'REJECTED', 'CANCELLED'],
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            email: { type: 'string' },
            fullName: { type: 'string' },
            role: { type: 'string', enum: ['ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR', 'DEPARTMENT_HEAD'] },
            externalId: { type: 'string', nullable: true },
            departmentId: { type: 'string', nullable: true },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Item: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            sku: { type: 'string' },
            name: { type: 'string' },
            categoryId: { type: 'string', format: 'uuid' },
            unit: { type: 'string' },
            reorderThreshold: { type: 'number' },
            currentStock: { type: 'number' },
            unitCost: { type: 'number' },
            isActive: { type: 'boolean' },
          },
        },
        Ris: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            risNumber: { type: 'string', example: 'RIS-2026-0001' },
            departmentId: { type: 'string', format: 'uuid' },
            purpose: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'APPROVED', 'PARTIALLY_ISSUED', 'ISSUED', 'REJECTED', 'CANCELLED'] },
          },
        },
        LedgerEntry: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            itemId: { type: 'string', format: 'uuid' },
            referenceType: { type: 'string', enum: ['OPENING_BALANCE', 'RECEIPT', 'ISSUANCE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RETURN'] },
            inflow: { type: 'number' },
            outflow: { type: 'number' },
            runningBalance: { type: 'number' },
            remarks: { type: 'string' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['LOW_STOCK', 'RIS', 'SYSTEM'] },
            title: { type: 'string' },
            message: { type: 'string' },
            isRead: { type: 'boolean' },
          },
        },
        AuditLog: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', nullable: true },
            action: { type: 'string' },
            entityType: { type: 'string' },
            entityId: { type: 'string' },
            before: { type: 'object', nullable: true },
            after: { type: 'object', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [path.join(__dirname, 'routes', '*.routes.js'), path.join(__dirname, 'routes', 'openapi.js')],
});

module.exports = swaggerSpec;
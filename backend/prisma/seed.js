require('dotenv').config();

const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');
const examplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
  fs.copyFileSync(examplePath, envPath);
  console.log('[setup] Created backend/.env from .env.example');
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const bcrypt = require('bcryptjs');

async function main() {
  console.log('[seed] Seeding database...');

  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || 'LguIms2026!';
  const password = bcrypt.hashSync(defaultPassword, 10);

  const tenant = await prisma.tenant.upsert({
    where: { code: 'default' },
    update: { name: 'Default Tenant' },
    create: { name: 'Default Tenant', code: 'default' },
  });

  const departments = [
    { name: 'General Services Office', code: 'GSO', headName: 'N/A – General Services Officer' },
    { name: 'City Health Office', code: 'CHO', headName: 'N/A – City Health Officer' },
    { name: 'Engineering Office', code: 'EO', headName: 'N/A – City Engineer' },
  ];
  const departmentRecords = {};
  for (const d of departments) {
    departmentRecords[d.code] = await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name, headName: d.headName },
      create: d,
    });
  }

  const categories = [
    { name: 'Office Supplies', description: 'Consumable office and administrative supplies' },
    { name: 'Janitorial Supplies', description: 'Cleaning and janitorial materials' },
    { name: 'Medical Supplies', description: 'Consumable medical and health office supplies' },
    { name: 'IT Equipment', description: 'Computers, peripherals and accessories' },
  ];
  const categoryRecords = {};
  for (const c of categories) {
    categoryRecords[c.name] = await prisma.category.upsert({
      where: { name: c.name },
      update: { description: c.description },
      create: c,
    });
  }

  const users = [
    { username: 'admin', email: 'admin@lgu.local', fullName: 'System Administrator', role: 'ADMIN', departmentId: departmentRecords.GSO.id },
    { username: 'warehouse', email: 'warehouse@lgu.local', fullName: 'Maria Santos', role: 'WAREHOUSE_STAFF', departmentId: departmentRecords.GSO.id },
    { username: 'custodian', email: 'custodian@lgu.local', fullName: 'Juan Dela Cruz', role: 'PROPERTY_CUSTODIAN', departmentId: departmentRecords.GSO.id },
    { username: 'auditor', email: 'auditor@lgu.local', fullName: 'Liza Reyes', role: 'AUDITOR', departmentId: null },
    { username: 'cho.head', email: 'cho.head@lgu.local', fullName: 'Dr. Ramon Garcia', role: 'DEPARTMENT_HEAD', departmentId: departmentRecords.CHO.id },
    { username: 'eo.head', email: 'eo.head@lgu.local', fullName: 'Engr. Pedro Villanueva', role: 'DEPARTMENT_HEAD', departmentId: departmentRecords.EO.id },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { tenantId_username: { tenantId: 'default', username: u.username } },
      update: { email: u.email, fullName: u.fullName, role: u.role, departmentId: u.departmentId, isActive: true, failedLoginAttempts: 0, lockedUntil: null },
      create: { ...u, password, tenantId: 'default' },
    });
  }

  const items = [
    { sku: 'OS-Bond-Short-70', name: 'Bond Paper, short (70gsm)', description: 'Ream of short bond paper, 70 gsm', categoryId: categoryRecords['Office Supplies'].id, unit: 'ream', reorderThreshold: 20, currentStock: 45, unitCost: 230 },
    { sku: 'OS-Bond-Long-70', name: 'Bond Paper, long (70gsm)', description: 'Ream of long bond paper, 70 gsm', categoryId: categoryRecords['Office Supplies'].id, unit: 'ream', reorderThreshold: 20, currentStock: 12, unitCost: 260 },
    { sku: 'OS-Ballpen-Black', name: 'Ballpen, black (0.5mm)', description: 'Black gel pen, 0.5mm', categoryId: categoryRecords['Office Supplies'].id, unit: 'piece', reorderThreshold: 100, currentStock: 340, unitCost: 12 },
    { sku: 'JS-Mop-Head', name: 'Mop head (floor type)', description: 'Cotton mop head for floor mops', categoryId: categoryRecords['Janitorial Supplies'].id, unit: 'piece', reorderThreshold: 15, currentStock: 8, unitCost: 95 },
    { sku: 'JS-Bleach', name: 'Bleaching Solution (1L)', description: 'Laundry bleach, 1 liter', categoryId: categoryRecords['Janitorial Supplies'].id, unit: 'bottle', reorderThreshold: 12, currentStock: 25, unitCost: 48 },
    { sku: 'MED-Gloves-Latex-M', name: 'Latex Exam Gloves, M', description: 'Box of 100, powder-free latex gloves', categoryId: categoryRecords['Medical Supplies'].id, unit: 'box', reorderThreshold: 30, currentStock: 60, unitCost: 350 },
    { sku: 'IT-Mouse-Wireless', name: 'Wireless Mouse', description: 'USB wireless optical mouse', categoryId: categoryRecords['IT Equipment'].id, unit: 'piece', reorderThreshold: 5, currentStock: 18, unitCost: 420 },
    { sku: 'IT-Toner-Canon2900', name: 'Toner Cartridge Canon 2900', description: 'Compatible toner for Canon LBP2900', categoryId: categoryRecords['IT Equipment'].id, unit: 'piece', reorderThreshold: 4, currentStock: 3, unitCost: 950 },
  ];
  const itemRecords = [];
  for (const i of items) {
    const item = await prisma.item.upsert({
      where: { tenantId_sku: { tenantId: 'default', sku: i.sku } },
      update: { ...i },
      create: { ...i, tenantId: 'default' },
    });
    itemRecords.push(item);
  }

  const existingLedger = await prisma.ledgerEntry.count();
  if (existingLedger === 0) {
    for (const item of itemRecords) {
      await prisma.ledgerEntry.create({
        data: {
          itemId: item.id,
          referenceType: 'OPENING_BALANCE',
          remarks: 'Opening balance',
          inflow: item.currentStock,
          runningBalance: item.currentStock,
        },
      });
    }
  }

  // ── Additional Items ─────────────────────────────────────────────────────────
  const moreItems = [
    { sku: 'OS-Stapler-Heavy', name: 'Heavy Duty Stapler', description: 'Desktop stapler, up to 50 sheets', categoryId: categoryRecords['Office Supplies'].id, unit: 'piece', reorderThreshold: 10, currentStock: 22, unitCost: 380 },
    { sku: 'JS-Detergent', name: 'Laundry Detergent (1kg)', description: 'Powder laundry detergent, 1kg pack', categoryId: categoryRecords['Janitorial Supplies'].id, unit: 'pack', reorderThreshold: 10, currentStock: 5, unitCost: 180 },
    { sku: 'IT-USB-Flash-32GB', name: 'USB Flash Drive 32GB', description: 'USB 2.0 flash drive, 32GB', categoryId: categoryRecords['IT Equipment'].id, unit: 'piece', reorderThreshold: 8, currentStock: 15, unitCost: 250 },
    { sku: 'MED-FaceMask-50', name: 'Surgical Face Mask (50s)', description: 'Disposable 3-ply surgical face mask, box of 50', categoryId: categoryRecords['Medical Supplies'].id, unit: 'box', reorderThreshold: 20, currentStock: 3, unitCost: 220 },
  ];
  for (const i of moreItems) {
    const item = await prisma.item.upsert({ where: { tenantId_sku: { tenantId: 'default', sku: i.sku } }, update: i, create: { ...i, tenantId: 'default' } });
    itemRecords.push(item);
    await prisma.ledgerEntry.create({
      data: {
        itemId: item.id,
        referenceType: 'OPENING_BALANCE',
        remarks: 'Opening balance',
        inflow: item.currentStock,
        runningBalance: item.currentStock,
      },
    });
  }

  // ── Supplier ────────────────────────────────────────────────────────────────
  const supplier = await prisma.supplier.upsert({
    where: { tenantId_name: { tenantId: 'default', name: 'Pacific Office Supplies Inc.' } },
    update: {},
    create: {
      name: 'Pacific Office Supplies Inc.',
      contact: 'Mr. Carlos Reyes',
      phone: '(02) 8123-4567',
      email: 'sales@pacificoffice.com.ph',
      address: '123 Quezon Avenue, Quezon City, Metro Manila',
      tenantId: 'default',
    },
  });

  const adminUser = await prisma.user.findUnique({ where: { tenantId_username: { tenantId: 'default', username: 'admin' } } });
  const warehouseUser = await prisma.user.findUnique({ where: { tenantId_username: { tenantId: 'default', username: 'warehouse' } } });
  const custodianUser = await prisma.user.findUnique({ where: { tenantId_username: { tenantId: 'default', username: 'custodian' } } });
  const choHeadUser = await prisma.user.findUnique({ where: { tenantId_username: { tenantId: 'default', username: 'cho.head' } } });

  // ── Purchase Order ─────────────────────────────────────────────────────────
  const bondShort = itemRecords.find(i => i.sku === 'OS-Bond-Short-70');
  const bondLong = itemRecords.find(i => i.sku === 'OS-Bond-Long-70');
  const stapler = itemRecords.find(i => i.sku === 'OS-Stapler-Heavy');

  const po1 = await prisma.purchaseOrder.upsert({
    where: { tenantId_poNumber: { tenantId: 'default', poNumber: 'PO-2025-0001' } },
    update: {},
    create: {
      poNumber: 'PO-2025-0001',
      departmentId: departmentRecords.CHO.id,
      supplierId: supplier.id,
      date: new Date('2025-11-10'),
      status: 'APPROVED',
      totalAmount: (bondShort.unitCost * 20) + (bondLong.unitCost * 15) + (stapler.unitCost * 5),
      remarks: 'Quarterly office supplies for CHO',
      createdById: warehouseUser.id,
      tenantId: 'default',
    },
  });

  await prisma.purchaseOrderItem.createMany({
    data: [
      { purchaseOrderId: po1.id, itemId: bondShort.id, quantity: 20, unitCost: bondShort.unitCost, receivedQuantity: 20 },
      { purchaseOrderId: po1.id, itemId: bondLong.id, quantity: 15, unitCost: bondLong.unitCost, receivedQuantity: 15 },
      { purchaseOrderId: po1.id, itemId: stapler.id, quantity: 5, unitCost: stapler.unitCost, receivedQuantity: 0 },
    ],
    skipDuplicates: true,
  });

  // ── Receiving (items arrived against PO) ─────────────────────────────────────
  const rec1 = await prisma.receiving.upsert({
    where: { tenantId_receivingNo: { tenantId: 'default', receivingNo: 'REC-2025-0001' } },
    update: {},
    create: {
      receivingNo: 'REC-2025-0001',
      supplierId: supplier.id,
      purchaseOrderId: po1.id,
      receiptDate: new Date('2025-11-18'),
      poNumber: 'PO-2025-0001',
      drNumber: 'DR-2025-1101',
      remarks: 'Delivered on time. All items inspected.',
      createdById: warehouseUser.id,
      tenantId: 'default',
    },
  });

  await prisma.receivingItem.createMany({
    data: [
      { receivingId: rec1.id, itemId: bondShort.id, quantity: 20, unitCost: bondShort.unitCost },
      { receivingId: rec1.id, itemId: bondLong.id, quantity: 15, unitCost: bondLong.unitCost },
    ],
    skipDuplicates: true,
  });

  // Update stock + ledger for received items
  for (const ri of [
    { itemId: bondShort.id, quantity: 20 },
    { itemId: bondLong.id, quantity: 15 },
  ]) {
    const item = await prisma.item.findUnique({ where: { id: ri.itemId } });
    const newBalance = item.currentStock + ri.quantity;
    await prisma.item.update({ where: { id: ri.itemId }, data: { currentStock: newBalance } });
    await prisma.ledgerEntry.create({
      data: {
        itemId: ri.itemId,
        referenceType: 'RECEIPT',
        referenceId: rec1.id,
        remarks: `Received against PO-2025-0001`,
        inflow: ri.quantity,
        runningBalance: newBalance,
        createdById: warehouseUser.id,
      },
    });
  }

  // ── RIS (Requisition and Issue Slip) ───────────────────────────────────────
  const ris1 = await prisma.ris.upsert({
    where: { tenantId_risNumber: { tenantId: 'default', risNumber: 'RIS-2025-0001' } },
    update: {},
    create: {
      risNumber: 'RIS-2025-0001',
      departmentId: departmentRecords.CHO.id,
      purpose: 'Routine office supplies for Q4 2025 operations',
      requestedById: choHeadUser.id,
      status: 'ISSUED',
      approvedById: custodianUser.id,
      approvedAt: new Date('2025-11-20'),
      certifiedById: adminUser.id,
      certifiedAt: new Date('2025-11-20'),
      issuedById: warehouseUser.id,
      issuedAt: new Date('2025-11-21'),
      remarks: 'Approved per department request',
      createdAt: new Date('2025-11-19'),
      tenantId: 'default',
    },
  });

  await prisma.risItem.createMany({
    data: [
      { risId: ris1.id, itemId: bondShort.id, quantityRequested: 5, quantityApproved: 5, quantityIssued: 5, unitCost: bondShort.unitCost },
      { risId: ris1.id, itemId: bondLong.id, quantityRequested: 3, quantityApproved: 3, quantityIssued: 3, unitCost: bondLong.unitCost },
    ],
    skipDuplicates: true,
  });

  // Issue from stock (reduce stock + ledger)
  for (const ri of [
    { itemId: bondShort.id, quantity: 5 },
    { itemId: bondLong.id, quantity: 3 },
  ]) {
    const item = await prisma.item.findUnique({ where: { id: ri.itemId } });
    const newBalance = item.currentStock - ri.quantity;
    await prisma.item.update({ where: { id: ri.itemId }, data: { currentStock: newBalance } });
    await prisma.ledgerEntry.create({
      data: {
        itemId: ri.itemId,
        referenceType: 'ISSUANCE',
        referenceId: ris1.id,
        remarks: `Issued against RIS-2025-0001`,
        outflow: ri.quantity,
        runningBalance: newBalance,
        createdById: warehouseUser.id,
      },
    });
  }

  // ── Budget ─────────────────────────────────────────────────────────────────
  await prisma.budget.upsert({
    where: { departmentId_year: { departmentId: departmentRecords.CHO.id, year: 2025 } },
    update: {},
    create: { departmentId: departmentRecords.CHO.id, amount: 150000, spent: 8740, year: 2025, tenantId: 'default' },
  });
  await prisma.budget.upsert({
    where: { departmentId_year: { departmentId: departmentRecords.EO.id, year: 2025 } },
    update: {},
    create: { departmentId: departmentRecords.EO.id, amount: 80000, spent: 12000, year: 2025, tenantId: 'default' },
  });
  await prisma.budget.upsert({
    where: { departmentId_year: { departmentId: departmentRecords.GSO.id, year: 2025 } },
    update: {},
    create: { departmentId: departmentRecords.GSO.id, amount: 200000, spent: 45800, year: 2025, tenantId: 'default' },
  });

  // ── Pending RIS (workflow demo) ────────────────────────────────────────────
  const faceMask = itemRecords.find(i => i.sku === 'MED-FaceMask-50');
  const ris2 = await prisma.ris.upsert({
    where: { tenantId_risNumber: { tenantId: 'default', risNumber: 'RIS-2025-0002' } },
    update: {},
    create: {
      risNumber: 'RIS-2025-0002',
      departmentId: departmentRecords.CHO.id,
      purpose: 'Emergency stock of face masks for health workers',
      requestedById: choHeadUser.id,
      status: 'PENDING',
      createdAt: new Date(),
      tenantId: 'default',
    },
  });
  await prisma.risItem.createMany({
    data: [
      { risId: ris2.id, itemId: faceMask.id, quantityRequested: 10, unitCost: faceMask.unitCost },
    ],
    skipDuplicates: true,
  });

  console.log('[seed] Done. Workflow data seeded:');
  console.log('  Suppliers: Pacific Office Supplies Inc.');
  console.log('  PO:  PO-2025-0001  →  APPROVED  →  REC-2025-0001 (partially received)');
  console.log('  RIS: RIS-2025-0001  →  ISSUED    →  stock decreased');
  console.log('  RIS: RIS-2025-0002  →  PENDING   →  awaiting approval');
  console.log('  Budget records created for all 3 departments');
  console.log('');
  console.log('  Demo login: username=admin  |  password=LguIms2026!');
}

main()
  .catch((e) => {
    console.error('[seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
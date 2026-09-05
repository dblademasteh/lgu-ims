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
      where: { username: u.username },
      update: { email: u.email, fullName: u.fullName, role: u.role, departmentId: u.departmentId, isActive: true },
      create: { ...u, password },
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
      where: { sku: i.sku },
      update: { ...i },
      create: { ...i },
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

  console.log('[seed] Done. Seed users created. Set SEED_DEFAULT_PASSWORD env var to customize default password.');
}

main()
  .catch((e) => {
    console.error('[seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
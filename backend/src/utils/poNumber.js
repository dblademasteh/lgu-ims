const prisma = require('../prisma');

async function generatePoNumber() {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const last = await prisma.purchaseOrder.findFirst({
    where: { poNumber: { startsWith: prefix } },
    orderBy: { poNumber: 'desc' },
  });
  let next = 1;
  if (last) {
    const num = Number(last.poNumber.slice(prefix.length));
    if (Number.isFinite(num)) next = num + 1;
  }
  return `${prefix}${String(next).padStart(4, '0')}`;
}

module.exports = { generatePoNumber };

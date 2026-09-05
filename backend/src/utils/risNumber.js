const prisma = require('../prisma');

async function generateRisNumber() {
  const year = new Date().getFullYear();
  const prefix = `RIS-${year}-`;
  const last = await prisma.ris.findFirst({
    where: { risNumber: { startsWith: prefix } },
    orderBy: { risNumber: 'desc' },
  });
  let next = 1;
  if (last) {
    const num = Number(last.risNumber.slice(prefix.length));
    if (Number.isFinite(num)) next = num + 1;
  }
  return `${prefix}${String(next).padStart(4, '0')}`;
}

module.exports = { generateRisNumber };
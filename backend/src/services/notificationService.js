const prisma = require('../prisma');
const { sendLowStockEmail } = require('./mailer');

const STOCK_MANAGER_ROLES = ['ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN'];

async function notifyLowStock(item) {
  if (item.currentStock > item.reorderThreshold) return;

  const users = await prisma.user.findMany({
    where: { isActive: true, role: { in: STOCK_MANAGER_ROLES } },
  });

  const messages = users.map((u) => ({
    userId: u.id,
    type: 'LOW_STOCK',
    title: 'Low stock alert',
    message: `${item.name} (${item.sku}) is at ${item.currentStock} ${item.unit} — at or below the reorder threshold of ${item.reorderThreshold} ${item.unit}.`,
    itemId: item.id,
  }));

  if (messages.length > 0) {
    await prisma.notification.createMany({ data: messages });
  }
  await sendLowStockEmail(item, users);
}

async function unreadCountFor(userId) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

module.exports = { notifyLowStock, unreadCountFor };
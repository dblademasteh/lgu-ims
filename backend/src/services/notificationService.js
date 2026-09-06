const prisma = require('../prisma');
const { sendLowStockEmail } = require('./mailer');

const STOCK_MANAGER_ROLES = ['ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN'];

async function notifyInApp({ userId, type = 'SYSTEM', title, message, itemId }) {
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_type: { userId, type } },
  });
  if (pref && pref.inApp === false) return;
  await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      ...(itemId ? { itemId } : {}),
    },
  });
}

async function emailAllowed(userId, type) {
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_type: { userId, type } },
  });
  return !pref || pref.email !== false;
}

async function notifyLowStock(item) {
  if (item.currentStock > item.reorderThreshold) return;

  const users = await prisma.user.findMany({
    where: { isActive: true, role: { in: STOCK_MANAGER_ROLES } },
  });
  if (users.length === 0) return;

  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: { in: users.map((u) => u.id) }, type: 'LOW_STOCK' },
  });
  const prefOf = (uid) => prefs.find((p) => p.userId === uid);

  const inAppUsers = users.filter((u) => (prefOf(u.id) ? prefOf(u.id).inApp !== false : true));
  if (inAppUsers.length > 0) {
    await prisma.notification.createMany({
      data: inAppUsers.map((u) => ({
        userId: u.id,
        type: 'LOW_STOCK',
        title: 'Low stock alert',
        message: `${item.name} (${item.sku}) is at ${item.currentStock} ${item.unit} — at or below the reorder threshold of ${item.reorderThreshold} ${item.unit}.`,
        itemId: item.id,
      })),
    });
  }

  const emailUsers = users.filter((u) => (prefOf(u.id) ? prefOf(u.id).email !== false : true));
  await sendLowStockEmail(item, emailUsers);
}

async function unreadCountFor(userId) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

module.exports = { notifyInApp, notifyLowStock, unreadCountFor, emailAllowed };
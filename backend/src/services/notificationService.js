const prisma = require('../prisma');
const { sendLowStockEmail } = require('./mailer');

const STOCK_MANAGER_ROLES = ['ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN'];

// Alert lead time and per-item reminder cooldown for expiry/warranty sweeps.
const EXPIRY_WINDOW_DAYS = 30;
const EXPIRY_REMINDER_COOLDOWN_DAYS = 7;

// All notification writes below are post-commit fire-and-forget: they must
// never throw and turn an already-committed workflow action into a 500.
// Failures are logged and swallowed by design.
async function notifyInApp({ userId, type = 'SYSTEM', title, message, itemId }) {
  try {
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
  } catch (err) {
    console.error(`[notify] in-app failed (user=${userId} type=${type}):`, err.message);
  }
}

async function emailAllowed(userId, type) {
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_type: { userId, type } },
  });
  return !pref || pref.email !== false;
}

async function notifyLowStock(item) {
  try {
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
  } catch (err) {
    console.error(`[notify] low-stock failed (item=${item?.id}):`, err.message);
  }
}

function expiryLine(label, date, unit) {
  const days = Math.ceil((new Date(date) - Date.now()) / 86400000);
  const when = days < 0 ? `expired ${Math.abs(days)} day(s) ago` : days === 0 ? 'expires today' : `expires in ${days} day(s)`;
  return { when, expired: days < 0 };
}

// Hourly sweep: items with an expiry/warranty date inside the alert window
// (or already past) raise one EXPIRY/WARRANTY notification per stock manager.
// Per-item cooldown prevents repeat spam; email coverage comes from the digest.
async function notifyExpiringItems() {
  try {
    const now = new Date();
    const horizon = new Date(now.getTime() + EXPIRY_WINDOW_DAYS * 86400000);
    const cooldownSince = new Date(now.getTime() - EXPIRY_REMINDER_COOLDOWN_DAYS * 86400000);

    const candidates = await prisma.item.findMany({
      where: {
        isActive: true,
        OR: [{ expiryDate: { lte: horizon } }, { warrantyExpiry: { lte: horizon } }],
      },
      select: { id: true, name: true, sku: true, unit: true, expiryDate: true, warrantyExpiry: true },
    });
    if (candidates.length === 0) return { expiry: 0, warranty: 0 };

    const managers = await prisma.user.findMany({
      where: { isActive: true, role: { in: STOCK_MANAGER_ROLES } },
      select: { id: true },
    });
    if (managers.length === 0) return { expiry: 0, warranty: 0 };

    const prefs = await prisma.notificationPreference.findMany({
      where: { userId: { in: managers.map((u) => u.id) }, type: { in: ['EXPIRY', 'WARRANTY'] } },
    });
    const optedOut = (uid, type) => {
      const p = prefs.find((x) => x.userId === uid && x.type === type);
      return p ? p.inApp === false : false;
    };

    const recent = await prisma.notification.findMany({
      where: { type: { in: ['EXPIRY', 'WARRANTY'] }, createdAt: { gte: cooldownSince } },
      select: { type: true, itemId: true },
    });
    const recentlyAlerted = new Set(recent.map((r) => `${r.type}:${r.itemId}`));

    const rows = [];
    for (const item of candidates) {
      const checks = [
        { type: 'EXPIRY', date: item.expiryDate, title: (w) => `Item expiring: ${item.name}`, message: (w) => `${item.name} (${item.sku}) ${w} (expiry).` },
        { type: 'WARRANTY', date: item.warrantyExpiry, title: (w) => `Warranty expiring: ${item.name}`, message: (w) => `${item.name} (${item.sku}) warranty ${w}.` },
      ];
      for (const c of checks) {
        if (!c.date || c.date > horizon) continue;
        if (recentlyAlerted.has(`${c.type}:${item.id}`)) continue;
        const { when } = expiryLine(c.type, c.date, item.unit);
        for (const m of managers) {
          if (optedOut(m.id, c.type)) continue;
          rows.push({ userId: m.id, type: c.type, title: c.title(when), message: c.message(when), itemId: item.id });
        }
      }
    }
    if (rows.length > 0) {
      await prisma.notification.createMany({ data: rows });
    }
    const counts = {
      expiry: rows.filter((r) => r.type === 'EXPIRY').length,
      warranty: rows.filter((r) => r.type === 'WARRANTY').length,
    };
    if (rows.length > 0) console.log(`[notify] expiry sweep: ${counts.expiry} expiry, ${counts.warranty} warranty alerts`);
    return counts;
  } catch (err) {
    console.error('[notify] expiry sweep failed:', err.message);
    return { expiry: 0, warranty: 0 };
  }
}

async function unreadCountFor(userId) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

module.exports = { notifyInApp, notifyLowStock, notifyExpiringItems, unreadCountFor, emailAllowed };

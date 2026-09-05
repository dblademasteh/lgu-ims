const prisma = require('../prisma');
const { paginate } = require('../utils/paginate');

async function listNotifications(req, res) {
  const { page, limit, offset } = paginate(req.query);
  const where = { userId: req.user.id };
  if (req.query.unread === 'true') where.isRead = false;

  const [total, data, unreadCount] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      include: { item: { select: { id: true, sku: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
  ]);

  res.json({ data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) }, unreadCount });
}

async function unreadCount(req, res) {
  const count = await prisma.notification.count({ where: { userId: req.user.id, isRead: false } });
  res.json({ unreadCount: count });
}

async function markRead(req, res) {
  const notification = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!notification) {
    const any = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!any) throw new (require('../utils/ApiError'))(404, 'Notification not found.');
    throw new (require('../utils/ApiError'))(403, 'This notification belongs to another user.');
  }
  const updated = await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
  res.json({ data: updated });
}

async function markAllRead(req, res) {
  await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
  res.json({ message: 'All notifications marked as read.' });
}

async function deleteNotification(req, res) {
  const notification = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!notification) {
    const any = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!any) throw new (require('../utils/ApiError'))(404, 'Notification not found.');
    throw new (require('../utils/ApiError'))(403, 'This notification belongs to another user.');
  }
  await prisma.notification.delete({ where: { id: req.params.id } });
  res.json({ message: 'Notification deleted.' });
}

async function cleanupOldNotifications(req, res) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const result = await prisma.notification.deleteMany({
    where: { createdAt: { lt: cutoff }, isRead: true },
  });
  res.json({ message: `Cleaned up ${result.count} old notifications.` });
}

module.exports = { listNotifications, unreadCount, markRead, markAllRead, deleteNotification, cleanupOldNotifications };
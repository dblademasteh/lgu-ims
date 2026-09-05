const prisma = require('../prisma');
const { sendNotificationDigest } = require('./mailer');

async function sendDailyDigest() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const users = await prisma.user.findMany({
    where: { isActive: true, email: { not: null } },
    include: {
      notifications: {
        where: {
          isRead: false,
          createdAt: { gte: yesterday, lt: today },
        },
        take: 50,
      },
    },
  });

  for (const user of users) {
    if (user.notifications.length === 0) continue;
    await sendNotificationDigest(user, user.notifications);
  }

  console.log(`[digest] Sent ${users.length} digests.`);
  await prisma.$disconnect();
}

sendDailyDigest().catch((e) => {
  console.error('[digest] failed:', e);
  process.exit(1);
});

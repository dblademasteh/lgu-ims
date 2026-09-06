const prisma = require('../prisma');
const config = require('../config');
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (!config.email.enabled) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: config.email.user ? { user: config.email.user, pass: config.email.pass } : undefined,
    });
  }
  return transporter;
}

async function sendMailDirect({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[mail] skipped (SMTP not configured): to=${to} subject=${subject}`);
    return { skipped: true };
  }
  return t.sendMail({ from: config.email.from, to, subject, text, html });
}

const POLL_INTERVAL = 5000;
const DEFAULT_MAX_ATTEMPTS = 5;
const DIGEST_INTERVAL_MS = (Number(process.env.DIGEST_INTERVAL_HOURS) || 24) * 60 * 60 * 1000;

let isProcessing = false;
let intervalId = null;
let digestIntervalId = null;
let lastDigestRun = null;

function startProcessor() {
  if (intervalId) return;
  intervalId = setInterval(() => {
    processQueue().catch((err) => console.error('[queue] processing error:', err.message));
  }, POLL_INTERVAL);
  intervalId.unref();
  console.log('[queue] Email job processor started');
  if (!digestIntervalId) {
    digestIntervalId = setInterval(() => {
      processDigests().catch((err) => console.error('[queue] digest error:', err.message));
    }, 60 * 60 * 1000);
    digestIntervalId.unref();
    console.log('[queue] Digest scheduler started (runs every hour)');
  }
}

function stopProcessor() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (digestIntervalId) {
    clearInterval(digestIntervalId);
    digestIntervalId = null;
  }
  console.log('[queue] Email job processor stopped');
}

async function enqueueEmail({ to, subject, text, html, maxAttempts = DEFAULT_MAX_ATTEMPTS, delayMs = 0 }) {
  const scheduledAt = new Date(Date.now() + delayMs);
  await prisma.emailJob.create({
    data: { to, subject, text, html, maxAttempts, scheduledAt },
  });
}

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    if (!config.email.enabled) {
      isProcessing = false;
      return;
    }

    const pending = await prisma.emailJob.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: new Date() },
        attempts: { lt: 5 },
      },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    for (const job of pending) {
      let result;
      try {
        await sendMailDirect({ to: job.to, subject: job.subject, text: job.text || undefined, html: job.html || undefined });
        result = { success: true };
      } catch (err) {
        result = { success: false, error: err.message };
      }

      if (result.success) {
        await prisma.emailJob.update({
          where: { id: job.id },
          data: { status: 'SENT', error: null },
        });
      } else {
        const nextAttempt = job.attempts + 1;
        const stillRetrying = nextAttempt < job.maxAttempts;
        await prisma.emailJob.update({
          where: { id: job.id },
          data: {
            status: stillRetrying ? 'PENDING' : 'FAILED',
            attempts: nextAttempt,
            error: result.error.substring(0, 1000),
          },
        });
      }
    }
  } finally {
    isProcessing = false;
  }
}

async function sendMailWithRetry({ to, subject, text, html }) {
  try {
    const result = await sendMailDirect({ to, subject, text, html });
    if (result?.skipped) {
      console.log(`[mail] skipped (SMTP not configured): to=${to} subject=${subject}`);
    } else {
      console.log(`[mail] sent to ${to}: ${subject}`);
    }
  } catch (err) {
    console.error(`[mail] failed: ${err.message}`);
    await enqueueEmail({ to, subject, text, html });
    console.log(`[mail] enqueued for retry: to=${to} subject=${subject}`);
  }
}

async function processDigests() {
  if (!config.email.enabled) return;
  if (lastDigestRun && (Date.now() - lastDigestRun) < DIGEST_INTERVAL_MS) return;

  const since = lastDigestRun ? new Date(lastDigestRun) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const usersWithEmailPrefs = await prisma.user.findMany({
    where: {
      isActive: true,
      email: { not: null },
      notificationPreferences: {
        some: { email: true },
      },
    },
    include: { notificationPreferences: true },
  });

  let sent = 0;
  for (const user of usersWithEmailPrefs) {
    const unread = await prisma.notification.findMany({
      where: {
        userId: user.id,
        isRead: false,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    if (unread.length === 0) continue;
    try {
      const lines = unread.map((n) => '- [' + n.type + '] ' + n.title + ': ' + n.message).join('\n');
      const subject = 'Daily notification digest (' + unread.length + ')';
      const text = 'Hello ' + user.fullName + ',\n\nYou have ' + unread.length + ' unread notification(s):\n\n' + lines + '\n\nSign in to the LGU IMS to review.\n';
      await enqueueEmail({ to: user.email, subject, text });
      sent++;
    } catch (err) {
      console.error('[digest] failed for', user.email, err.message);
    }
  }

  lastDigestRun = Date.now();
  if (sent > 0) console.log(`[queue] Digest emails enqueued for ${sent} user(s)`);
}

async function getStats() {
  const [total, pending, sent, failed] = await Promise.all([
    prisma.emailJob.count(),
    prisma.emailJob.count({ where: { status: 'PENDING' } }),
    prisma.emailJob.count({ where: { status: 'SENT' } }),
    prisma.emailJob.count({ where: { status: 'FAILED' } }),
  ]);
  return { total, pending, sent, failed };
}

module.exports = { enqueueEmail, sendMailWithRetry, processQueue, processDigests, startProcessor, stopProcessor, getStats };

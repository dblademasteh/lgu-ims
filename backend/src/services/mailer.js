const nodemailer = require('nodemailer');
const config = require('../config');
const { lowStock, passwordReset, risCreated, risStatusChange } = require('./templates');

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

async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[mail] skipped (SMTP not configured): to=${to} subject=${subject}`);
    return;
  }
  try {
    await t.sendMail({ from: config.email.from, to, subject, text, html });
    console.log(`[mail] sent to ${to}: ${subject}`);
  } catch (err) {
    console.error(`[mail] failed: ${err.message}`);
  }
}

async function sendLowStockEmail(item, users) {
  const emails = users.map((u) => u.email).filter(Boolean);
  if (emails.length === 0) return;
  const tpl = lowStock(item);
  await sendMail({ to: emails.join(', '), subject: tpl.subject, text: tpl.text, html: tpl.html });
}

async function sendPasswordResetEmail(user, resetUrl) {
  const tpl = passwordReset(user.username, resetUrl);
  await sendMail({ to: user.email, subject: tpl.subject, text: tpl.text, html: tpl.html });
}

async function sendRisCreatedEmail(ris, departmentName, recipients) {
  const emails = recipients.map((u) => u.email).filter(Boolean);
  if (emails.length === 0) return;
  const url = `${config.appUrl || ''}/ris`;
  const tpl = risCreated(ris.risNumber, departmentName, ris.purpose, url);
  await sendMail({ to: emails.join(', '), subject: tpl.subject, text: tpl.text, html: tpl.html });
}

async function sendRisStatusEmail(ris, recipient) {
  const url = `${config.appUrl || ''}/ris`;
  const tpl = risStatusChange(ris.risNumber, ris.status, url);
  await sendMail({ to: recipient.email, subject: tpl.subject, text: tpl.text, html: tpl.html });
}

async function sendNotificationDigest(user, notifications) {
  if (!user.email || notifications.length === 0) return;
  const lines = notifications.map((n) => `- [${n.type}] ${n.title}: ${n.message}`).join('\n');
  const subject = `Daily notification digest (${notifications.length})`;
  const text = `Hello ${user.fullName},\n\nYou have ${notifications.length} unread notifications:\n\n${lines}\n\nPlease sign in to the system to review.`;
  await sendMail({ to: user.email, subject, text });
}

module.exports = { sendMail, sendLowStockEmail, sendPasswordResetEmail, sendRisCreatedEmail, sendRisStatusEmail, sendNotificationDigest };
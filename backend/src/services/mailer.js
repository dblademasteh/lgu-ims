const { sendMailWithRetry, enqueueEmail } = require('./queue');
const { lowStock, passwordReset, risCreated, risStatusChange } = require('./templates');
const config = require('../config');

async function sendMail({ to, subject, text, html }) {
  await sendMailWithRetry({ to, subject, text, html });
}

async function sendLowStockEmail(item, users) {
  const emails = users.map((u) => u.email).filter(Boolean);
  if (emails.length === 0) return;
  const tpl = lowStock(item);
  await enqueueEmail({ to: emails.join(', '), subject: tpl.subject, text: tpl.text, html: tpl.html });
}

async function sendPasswordResetEmail(user, resetUrl) {
  const tpl = passwordReset(user.username, resetUrl);
  await enqueueEmail({ to: user.email, subject: tpl.subject, text: tpl.text, html: tpl.html });
}

async function sendRisCreatedEmail(ris, departmentName, recipients) {
  const emails = recipients.map((u) => u.email).filter(Boolean);
  if (emails.length === 0) return;
  const url = `${config.appUrl || ''}/ris`;
  const tpl = risCreated(ris.risNumber, departmentName, ris.purpose, url);
  await enqueueEmail({ to: emails.join(', '), subject: tpl.subject, text: tpl.text, html: tpl.html });
}

async function sendRisStatusEmail(ris, recipient) {
  const url = `${config.appUrl || ''}/ris`;
  const tpl = risStatusChange(ris.risNumber, ris.status, url);
  await enqueueEmail({ to: recipient.email, subject: tpl.subject, text: tpl.text, html: tpl.html });
}

async function sendNotificationDigest(user, notifications) {
  if (!user.email || notifications.length === 0) return;
  const lines = notifications.map((n) => `- [${n.type}] ${n.title}: ${n.message}`).join('\n');
  const subject = `Daily notification digest (${notifications.length})`;
  const text = `Hello ${user.fullName},\n\nYou have ${notifications.length} unread notifications:\n\n${lines}\n\nPlease sign in to the system to review.`;
  await enqueueEmail({ to: user.email, subject, text });
}

module.exports = { sendMail, sendLowStockEmail, sendPasswordResetEmail, sendRisCreatedEmail, sendRisStatusEmail, sendNotificationDigest };

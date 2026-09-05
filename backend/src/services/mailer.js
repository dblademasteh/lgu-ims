const nodemailer = require('nodemailer');
const config = require('../config');

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
  await sendMail({
    to: emails.join(', '),
    subject: `LOW STOCK: ${item.name} (${item.sku})`,
    text:
      `This is an automated low-stock alert.\n\n` +
      `Item: ${item.name}\nSKU: ${item.sku}\n` +
      `Current stock: ${item.currentStock} ${item.unit}\nReorder threshold: ${item.reorderThreshold} ${item.unit}\n\n` +
      `Please reorder at your earliest convenience.\n\n- LGU Inventory Management System`,
  });
}

module.exports = { sendMail, sendLowStockEmail };
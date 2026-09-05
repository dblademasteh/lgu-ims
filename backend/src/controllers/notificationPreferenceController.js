const prisma = require('../prisma');
const ApiError = require('../utils/ApiError');
const { writeAudit } = require('../utils/audit');
const { sanitizeString } = require('../utils/sanitize');

function sanitizeBody(body, fields = []) {
  const out = { ...body };
  for (const f of fields) {
    if (out[f] !== undefined) out[f] = sanitizeString(out[f]);
  }
  return out;
}

async function getPreferences(req, res) {
  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: req.user.id },
  });
  const defaults = [
    { type: 'LOW_STOCK', email: true, inApp: true },
    { type: 'RIS', email: true, inApp: true },
    { type: 'SYSTEM', email: true, inApp: true },
  ];
  const merged = defaults.map((d) => {
    const existing = prefs.find((p) => p.type === d.type);
    return existing || { ...d, userId: req.user.id };
  });
  res.json({ data: merged });
}

async function updatePreferences(req, res) {
  const body = sanitizeBody(req.body, []);
  const { preferences } = body;
  if (!Array.isArray(preferences)) throw new ApiError(400, 'preferences must be an array.');

  await prisma.$transaction(async (tx) => {
    for (const pref of preferences) {
      await tx.notificationPreference.upsert({
        where: {
          userId_type: {
            userId: req.user.id,
            type: pref.type,
          },
        },
        create: {
          userId: req.user.id,
          type: pref.type,
          email: Boolean(pref.email),
          inApp: Boolean(pref.inApp),
        },
        update: {
          email: Boolean(pref.email),
          inApp: Boolean(pref.inApp),
        },
      });
    }
  });

  await writeAudit(req, 'UPDATE', 'NotificationPreference', req.user.id, null, { preferences });
  res.json({ message: 'Notification preferences updated.' });
}

module.exports = { getPreferences, updatePreferences };

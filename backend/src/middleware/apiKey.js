const crypto = require('crypto');
const prisma = require('../prisma');

async function apiKeyAuth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) return next();

  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = key.slice(0, 8);

  const record = await prisma.apiKey.findFirst({
    where: { keyPrefix: prefix, keyHash: hash },
    include: { createdBy: { include: { department: true } } },
  });

  if (!record) {
    return res.status(401).json({ message: 'Invalid API key.' });
  }

  if (record.expiresAt && record.expiresAt < new Date()) {
    return res.status(401).json({ message: 'API key expired.' });
  }

  await prisma.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });

  req.user = record.createdBy;
  next();
}

module.exports = { apiKeyAuth };

const crypto = require('crypto');
const prisma = require('../prisma');
const ApiError = require('../utils/ApiError');
const { writeAudit } = require('../utils/audit');
const { sanitizeString } = require('../utils/sanitize');

async function listApiKeys(req, res) {
  const keys = await prisma.apiKey.findMany({
    where: { createdById: req.user.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: keys.map((k) => ({ ...k, key: undefined })) });
}

async function createApiKey(req, res) {
  const body = { ...req.body };
  if (body.name !== undefined) body.name = sanitizeString(body.name);
  const { name, expiresInDays } = body;
  if (!name) throw new ApiError(400, 'Name is required.');

  const days = expiresInDays ? Number(expiresInDays) : undefined;
  if (days !== undefined && (!Number.isFinite(days) || days <= 0)) {
    throw new ApiError(400, 'expiresInDays must be a positive number.');
  }

  const raw = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const prefix = raw.slice(0, 8);
  const expiresAt = days ? new Date(Date.now() + days * 86400000) : null;

  const key = await prisma.apiKey.create({
    data: {
      name,
      keyPrefix: prefix,
      keyHash: hash,
      expiresAt,
      createdById: req.user.id,
    },
  });

  await writeAudit(req, 'CREATE', 'ApiKey', key.id, null, { name });
  res.status(201).json({ data: { ...key, key: `${prefix}.${raw}` } });
}

async function revokeApiKey(req, res) {
  const key = await prisma.apiKey.findUnique({ where: { id: req.params.id } });
  if (!key || key.createdById !== req.user.id) throw new ApiError(404, 'API key not found.');

  await prisma.apiKey.delete({ where: { id: key.id } });
  await writeAudit(req, 'DELETE', 'ApiKey', key.id, { name: key.name }, null);
  res.json({ message: 'API key revoked.' });
}

module.exports = { listApiKeys, createApiKey, revokeApiKey };

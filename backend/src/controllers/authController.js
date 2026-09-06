const bcrypt = require('bcryptjs');
const prisma = require('../prisma');
const ApiError = require('../utils/ApiError');
const { writeAudit } = require('../utils/audit');
const { signToken, publicUser } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { sendMail, sendPasswordResetEmail } = require('../services/mailer');
const { authenticator } = require('otplib');
const { sanitizeString } = require('../utils/sanitize');
const crypto = require('crypto');

function sanitizeBody(body, fields = []) {
  const out = { ...body };
  for (const f of fields) {
    if (out[f] !== undefined) out[f] = sanitizeString(out[f]);
  }
  return out;
}

function parseExpiry(str, fallbackMs) {
    const match = String(str).match(/^(\d+)([smhd])$/);
    if (!match) return fallbackMs;
    const n = Number(match[1]);
    const unit = match[2];
    const mult = { 's': 1000, 'm': 60000, 'h': 3600000, 'd': 86400000 }[unit] || fallbackMs;
    return n * mult;
  }

async function issueRefreshToken(userId) {
  const MAX_SESSIONS = 5;
  const existing = await prisma.refreshToken.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  if (existing.length >= MAX_SESSIONS) {
    const toDelete = existing.slice(0, existing.length - MAX_SESSIONS + 1);
    await prisma.refreshToken.deleteMany({
      where: { id: { in: toDelete.map((t) => t.id) } },
    });
  }

  const raw = crypto.randomBytes(40).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + parseExpiry(config.refreshTokenExpiresIn, 7 * 24 * 60 * 60 * 1000));
  await prisma.refreshToken.create({
    data: {
      userId,
      token: hash,
      expiresAt,
    },
  });
  return raw;
}

async function login(req, res) {
  const body = sanitizeBody(req.body, ['username']);
  const { username, password } = body;
  if (!username || !password) {
    throw new ApiError(400, 'Username and password are required.');
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ username }, { email: username }] },
    include: { department: true },
  });

  if (!user) {
    await writeAudit(req, 'LOGIN_FAILED', 'User', null, null, { username });
    throw new ApiError(401, 'Invalid username or password.');
  }

  if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
    const remaining = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
    throw new ApiError(403, `Account is locked due to too many failed attempts. Try again in ${remaining} minutes.`);
  }

  const valid = user && (await bcrypt.compare(password, user.password));
  if (!valid) {
    const attempts = (user.failedLoginAttempts || 0) + 1;
    const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: attempts, lockedUntil: lockUntil } });
    await writeAudit(req, 'LOGIN_FAILED', 'User', user.id, null, { username: user.username, attempts });
    throw new ApiError(401, 'Invalid username or password.');
  }
  if (!user.isActive) {
    throw new ApiError(403, 'This account has been deactivated. Contact the administrator.');
  }

  await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  await writeAudit(req, 'LOGIN', 'User', user.id, null, { username: user.username });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  if (user.passwordChangedAt) {
    const ageMs = Date.now() - new Date(user.passwordChangedAt).getTime();
    const maxAge = config.passwordExpiryDays * 24 * 60 * 60 * 1000;
    if (ageMs > maxAge) {
      const tempToken = jwt.sign({ sub: user.id, type: 'pwd_expired' }, config.jwtSecret, { expiresIn: '5m' });
      return res.json({ requiresPasswordChange: true, tempToken, user: publicUser(user) });
    }
  }

  if (user.twoFactorEnabled) {
    const tempToken = jwt.sign({ sub: user.id, type: '2fa_pending' }, config.jwtSecret, { expiresIn: '5m' });
    return res.json({ requires2FA: true, tempToken, user: publicUser(user) });
  }

  res.json({
    token: signToken(user),
    refreshToken: await issueRefreshToken(user.id),
    user: publicUser(user),
  });
}

async function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

async function changePassword(req, res) {
  const body = sanitizeBody(req.body, ['currentPassword', 'newPassword']);
  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current and new passwords are required.');
  }
  if (newPassword.length < 8) {
    throw new ApiError(400, 'New password must be at least 8 characters.');
  }

  const ok = await bcrypt.compare(currentPassword, req.user.password);
  if (!ok) throw new ApiError(400, 'Current password is incorrect.');

  const hash = await bcrypt.hash(newPassword, config.bcryptRounds);
  await prisma.user.update({ where: { id: req.user.id }, data: { password: hash, passwordChangedAt: new Date() } });
  await writeAudit(req, 'PASSWORD_CHANGE', 'User', req.user.id, null, { username: req.user.username });

  res.json({ message: 'Password updated successfully.' });
}

async function logout(req, res) {
  await writeAudit(req, 'LOGOUT', 'User', req.user.id, null, { username: req.user.username });
  res.json({ message: 'Signed out.' });
}

async function forgotPassword(req, res) {
  const body = sanitizeBody(req.body, ['username']);
  const { username } = body;
  if (!username) throw new ApiError(400, 'Username or email is required.');

  const user = await prisma.user.findFirst({
    where: { OR: [{ username }, { email: username }] },
  });

  const resetToken = user
    ? jwt.sign({ sub: user.id, type: 'reset' }, config.jwtSecret, { expiresIn: '1h' })
    : jwt.sign({ type: 'reset', dummy: true }, config.jwtSecret, { expiresIn: '1h' });

  const appUrl = (config.appUrl || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

  if (user) {
    await sendPasswordResetEmail(user, resetUrl).catch(() => {});
  }

  res.json({ message: 'If an account matches, a reset link has been sent.' });
}

async function resetPassword(req, res) {
  const body = sanitizeBody(req.body, ['token', 'newPassword']);
  const { token, newPassword } = body;
  if (!token || !newPassword) throw new ApiError(400, 'Token and new password are required.');
  if (newPassword.length < 8) throw new ApiError(400, 'New password must be at least 8 characters.');

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new ApiError(400, 'Invalid or expired reset token.');
  }
  if (payload.type !== 'reset' || !payload.sub) throw new ApiError(400, 'Invalid reset token.');

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new ApiError(404, 'User not found.');

  await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(newPassword, config.bcryptRounds), passwordChangedAt: new Date() } });
  await writeAudit(req, 'PASSWORD_RESET', 'User', user.id, null, { username: user.username });

  res.json({ message: 'Password has been reset.' });
}

async function twoFactorSetup(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw new ApiError(404, 'User not found.');

  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(user.username, 'LGU IMS', secret);
  const dataUrl = await QRCode.toDataURL(otpauth, { margin: 1, width: 320 });

  res.json({ secret, otpauth, dataUrl });
}

async function twoFactorEnable(req, res) {
  const body = sanitizeBody(req.body, ['code']);
  const { code } = body;
  if (!code) throw new ApiError(400, 'Verification code is required.');

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user || !user.twoFactorSecret) throw new ApiError(400, '2FA setup not initiated.');

  const ok = authenticator.verify({ token: code, secret: user.twoFactorSecret });
  if (!ok) throw new ApiError(400, 'Invalid verification code.');

  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
  await writeAudit(req, '2FA_ENABLE', 'User', user.id, null, { username: user.username });

  res.json({ message: 'Two-factor authentication enabled.' });
}

async function twoFactorDisable(req, res) {
  const body = sanitizeBody(req.body, ['code']);
  const { code } = body;
  if (!code) throw new ApiError(400, 'Verification code is required.');

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user || !user.twoFactorEnabled) throw new ApiError(400, '2FA is not enabled.');

  const ok = authenticator.verify({ token: code, secret: user.twoFactorSecret });
  if (!ok) throw new ApiError(400, 'Invalid verification code.');

  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
  await writeAudit(req, '2FA_DISABLE', 'User', user.id, null, { username: user.username });

  res.json({ message: 'Two-factor authentication disabled.' });
}

async function twoFactorLogin(req, res) {
  const body = sanitizeBody(req.body, ['tempToken', 'code']);
  const { tempToken, code } = body;
  if (!tempToken || !code) throw new ApiError(400, 'Temporary token and code are required.');

  let payload;
  try {
    payload = jwt.verify(tempToken, config.jwtSecret);
  } catch {
    throw new ApiError(401, 'Invalid or expired session token.');
  }
  if (payload.type !== '2fa_pending') throw new ApiError(401, 'Invalid session token.');

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { department: true } });
  if (!user || !user.isActive) throw new ApiError(401, 'Account is inactive or no longer exists.');
  if (!user.twoFactorEnabled) throw new ApiError(400, '2FA is not enabled for this account.');

  const ok = authenticator.verify({ token: code, secret: user.twoFactorSecret });
  if (!ok) throw new ApiError(401, 'Invalid verification code.');

  await writeAudit(req, 'LOGIN', 'User', user.id, null, { username: user.username, twoFactor: true });

  res.json({
    token: signToken(user),
    refreshToken: await issueRefreshToken(user.id),
    user: publicUser(user),
  });
}

async function refreshToken(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new ApiError(400, 'refreshToken is required.');

  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const stored = await prisma.refreshToken.findUnique({
    where: { token: hash },
    include: { user: { include: { department: true } } },
  });

  if (!stored || stored.expiresAt < new Date()) {
    await prisma.refreshToken.deleteMany({ where: { token: hash } });
    throw new ApiError(401, 'Invalid or expired refresh token.');
  }

  const user = stored.user;
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Account is inactive or no longer exists.');
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } });
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  const newRefreshToken = await issueRefreshToken(user.id);

  res.json({
    token: signToken(user),
    refreshToken: newRefreshToken,
    user: publicUser(user),
  });
}

async function logout(req, res) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.refreshToken.deleteMany({ where: { token: hash } }).catch(() => {});
  }
  await writeAudit(req, 'LOGOUT', 'User', req.user.id, null, { username: req.user.username });
  res.json({ message: 'Signed out.' });
}

module.exports = { login, me, changePassword, logout, forgotPassword, resetPassword, twoFactorSetup, twoFactorEnable, twoFactorDisable, twoFactorLogin, refreshToken };

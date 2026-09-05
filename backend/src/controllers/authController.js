const bcrypt = require('bcryptjs');
const prisma = require('../prisma');
const ApiError = require('../utils/ApiError');
const { writeAudit } = require('../utils/audit');
const { signToken, publicUser } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { sendMail, sendPasswordResetEmail } = require('../services/mailer');

async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    throw new ApiError(400, 'Username and password are required.');
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ username }, { email: username }] },
    include: { department: true },
  });

  const valid = user && (await bcrypt.compare(password, user.password));
  if (!valid) {
    throw new ApiError(401, 'Invalid username or password.');
  }
  if (!user.isActive) {
    throw new ApiError(403, 'This account has been deactivated. Contact the administrator.');
  }

  await writeAudit(req, 'LOGIN', 'User', user.id, null, { username: user.username });

  res.json({
    token: signToken(user),
    user: publicUser(user),
  });
}

async function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current and new passwords are required.');
  }
  if (newPassword.length < 8) {
    throw new ApiError(400, 'New password must be at least 8 characters.');
  }

  const ok = await bcrypt.compare(currentPassword, req.user.password);
  if (!ok) throw new ApiError(400, 'Current password is incorrect.');

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: req.user.id }, data: { password: hash } });
  await writeAudit(req, 'PASSWORD_CHANGE', 'User', req.user.id, null, { username: req.user.username });

  res.json({ message: 'Password updated successfully.' });
}

async function logout(req, res) {
  await writeAudit(req, 'LOGOUT', 'User', req.user.id, null, { username: req.user.username });
  res.json({ message: 'Signed out.' });
}

async function forgotPassword(req, res) {
  const { username } = req.body;
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
  const { token, newPassword } = req.body;
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

  await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(newPassword, 10) } });
  await writeAudit(req, 'PASSWORD_RESET', 'User', user.id, null, { username: user.username });

  res.json({ message: 'Password has been reset.' });
}

module.exports = { login, me, changePassword, logout, forgotPassword, resetPassword };
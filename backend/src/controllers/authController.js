const bcrypt = require('bcryptjs');
const prisma = require('../prisma');
const ApiError = require('../utils/ApiError');
const { writeAudit } = require('../utils/audit');
const { signToken, publicUser } = require('../middleware/auth');

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

module.exports = { login, me, changePassword, logout };
const rateLimit = require('express-rate-limit');
const config = require('../config');

const isDev = config.env === 'development';

const devSkip = (req, res, next) => next();

const authLimiter = isDev ? devSkip : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in a few minutes.' },
});

const strictAuthLimiter = isDev ? devSkip : rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many password attempts. Your account has been temporarily locked.' },
});

const writeLimiter = isDev ? devSkip : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many write operations. Please slow down.' },
});

module.exports = { authLimiter, strictAuthLimiter, writeLimiter };

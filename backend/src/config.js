require('dotenv').config();

const config = {
  port: Number(process.env.PORT) || 4000,
  env: process.env.NODE_ENV || 'development',
  jwtSecret: (() => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET environment variable is required in production.');
      }
      console.warn('WARNING: JWT_SECRET is not set. Using insecure dev fallback. Set JWT_SECRET before deploying.');
    }
    return secret || 'dev-secret-change-me';
  })(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 10,
  passwordExpiryDays: Number(process.env.PASSWORD_EXPIRY_DAYS) || 90,
  auditChainSecret: (() => {
    const secret = process.env.AUDIT_CHAIN_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('AUDIT_CHAIN_SECRET environment variable is required in production.');
      }
      console.warn('WARNING: AUDIT_CHAIN_SECRET is not set. Using insecure dev fallback.');
    }
    return secret || 'dev-audit-chain-secret-change-me';
  })(),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  email: {
    enabled: process.env.EMAIL_NOTIFY_ENABLED === 'true',
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'LGU IMS <no-reply@lgu.local>',
  },
  appUrl: process.env.APP_URL || '',
};

module.exports = config;

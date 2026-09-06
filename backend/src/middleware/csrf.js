const crypto = require('crypto');

function getCsrfSecret() {
  return process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');
}

function CsrfMiddleware(exclude = []) {
  const secret = getCsrfSecret();
  const isDev = process.env.NODE_ENV === 'development';

  return {
    middleware: [
      (req, res, next) => {
        if (req.method === 'GET' || req.method === 'HEAD') {
          const existing = req.cookies?.['XSRF-TOKEN'];
          if (!existing) {
            res.cookie('XSRF-TOKEN', secret, {
              httpOnly: false,
              sameSite: 'strict',
              secure: process.env.NODE_ENV === 'production',
              maxAge: 7 * 24 * 60 * 60 * 1000,
            });
          }
        }
        next();
      },
      (req, res, next) => {
        if (isDev) return next();
        if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
          return next();
        }
        if (exclude.some((p) => req.path === p || req.path.startsWith(p + '/'))) {
          return next();
        }
        const cookieToken = req.cookies?.['XSRF-TOKEN'];
        const headerToken = req.headers['x-xsrf-token'];
        if (!cookieToken || !headerToken || cookieToken !== headerToken) {
          return res.status(403).json({ message: 'Invalid CSRF token.' });
        }
        next();
      },
    ],
    getSecret: () => secret,
  };
}

module.exports = CsrfMiddleware;

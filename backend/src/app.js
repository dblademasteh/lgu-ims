const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');
const routes = require('./routes');
const swaggerSpec = require('./swagger');
const { notFoundHandler, errorHandler } = require('./middleware/error');
const { authLimiter, strictAuthLimiter, writeLimiter } = require('./middleware/rateLimit');
const { apiKeyAuth } = require('./middleware/apiKey');
const { uploadDir } = require('./middleware/upload');
const CsrfMiddleware = require('./middleware/csrf');

const app = express();

if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  Sentry.init({ dsn: process.env.SENTRY_DSN, environment: config.env });
  app.use(Sentry.Handlers.requestHandler());
}

const csrf = CsrfMiddleware();
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: {
    maxAge: 15552000,
    includeSubDomains: true,
    preload: true,
  },
}));
app.use(cors({ origin: config.corsOrigins.includes('*') ? true : config.corsOrigins, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'lgu-ims-backend', time: new Date().toISOString() });
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'LGU IMS API Docs' }));

app.use('/api/v1/auth/login', strictAuthLimiter);
app.use('/api/v1/auth/forgot-password', authLimiter);
app.use('/api/v1/auth/reset-password', authLimiter);

app.use(apiKeyAuth);
app.use(csrf.middleware[0]);
app.use('/api/v1', writeLimiter, csrf.middleware[1], routes);

app.use(notFoundHandler);
if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  app.use(Sentry.Handlers.errorHandler());
}
app.use(errorHandler);

module.exports = app;

const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');
const routes = require('./routes');
const swaggerSpec = require('./swagger');
const { notFoundHandler, errorHandler } = require('./middleware/error');
const { authLimiter, strictAuthLimiter } = require('./middleware/rateLimit');

const app = express();

app.use(cors({ origin: config.corsOrigins.includes('*') ? true : config.corsOrigins, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'lgu-ims-backend', time: new Date().toISOString() });
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'LGU IMS API Docs' }));

app.use('/api/v1/auth/login', strictAuthLimiter);
app.use('/api/v1/auth/forgot-password', authLimiter);
app.use('/api/v1/auth/reset-password', authLimiter);

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
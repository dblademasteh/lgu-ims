const app = require('./app');
const config = require('./config');
const prisma = require('./prisma');
const { startProcessor, stopProcessor } = require('./services/queue');

async function start() {
  try {
    await prisma.$connect();
    console.log('[db] Connected to PostgreSQL');
  } catch (err) {
    console.error('[db] Could not connect to PostgreSQL. Is it running?', err.message);
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`[api] LGU IMS backend listening on http://localhost:${config.port}`);
    console.log(`[api] Swagger docs at http://localhost:${config.port}/api/docs`);
  });

  startProcessor();
}

process.on('SIGTERM', () => {
  console.log('[api] SIGTERM received, shutting down...');
  stopProcessor();
  prisma.$disconnect().then(() => process.exit(0));
});

start();

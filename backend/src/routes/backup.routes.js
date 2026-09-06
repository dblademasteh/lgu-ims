const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { execSync } = require('child_process');
const { writeAudit } = require('../utils/audit');
const config = require('../config');

const router = Router();

router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL not set.');

  const url = new URL(dbUrl);
  const host = url.hostname;
  const port = url.port || 5432;
  const user = url.username;
  const password = url.password;
  const dbname = url.pathname.replace('/', '');

  const filename = `lgu_ims_backup_${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.sql`;

  try {
    const env = { ...process.env, PGPASSWORD: password };
    const cmd = `pg_dump -h "${host}" -p ${port} -U "${user}" -d "${dbname}" --no-owner --no-acl -f -`;
    const buffer = execSync(cmd, { env });

    await writeAudit(req, 'BACKUP', 'System', null, null, { filename, size: buffer.length });

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error('Backup error:', err.message);
    res.status(500).json({ message: 'Backup failed: ' + err.message });
  }
});

module.exports = router;

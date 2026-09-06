const config = require('../config');

const flags = {
  ALLOW_ICS_DOWNLOAD: process.env.FLAG_ALLOW_ICS_DOWNLOAD !== 'false',
  ALLOW_APP_DOWNLOAD: process.env.FLAG_ALLOW_APP_DOWNLOAD !== 'false',
  REQUIRE_2FA: process.env.FLAG_REQUIRE_2FA === 'true',
  ENFORCE_MAX_STOCK: process.env.FLAG_ENFORCE_MAX_STOCK === 'true',
  ALLOW_SUPPLIER_PERFORMANCE: process.env.FLAG_ALLOW_SUPPLIER_PERFORMANCE !== 'false',
  ALLOW_BACKUP: process.env.FLAG_ALLOW_BACKUP !== 'false',
  ...(process.env.FLAGS_JSON ? JSON.parse(process.env.FLAGS_JSON) : {}),
};

const overrides = {};

function getFlag(key) {
  if (overrides[key] !== undefined) return overrides[key];
  return flags[key] ?? false;
}

function setFlag(key, value) {
  overrides[key] = Boolean(value);
}

function listFlags() {
  return Object.entries(flags).map(([key, defaultValue]) => ({
    key,
    defaultValue,
    currentValue: getFlag(key),
    overridden: overrides[key] !== undefined,
  }));
}

module.exports = { getFlag, setFlag, listFlags };

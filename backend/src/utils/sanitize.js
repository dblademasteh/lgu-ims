const DEFAULT_MAX = 500;

function sanitizeString(value, max = DEFAULT_MAX) {
  if (value === null || value === undefined) return null;
  const str = String(value);
  const stripped = str.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim();
  return stripped.length > max ? stripped.slice(0, max) : stripped;
}

function sanitizePayload(payload, fields = []) {
  if (!payload || typeof payload !== 'object') return payload;
  const out = { ...payload };
  for (const key of Object.keys(out)) {
    if (fields.includes(key) || typeof out[key] === 'string') {
      out[key] = sanitizeString(out[key]);
    } else if (typeof out[key] === 'object' && out[key] !== null && !Array.isArray(out[key])) {
      out[key] = sanitizePayload(out[key], fields);
    }
  }
  return out;
}

module.exports = { sanitizeString, sanitizePayload };

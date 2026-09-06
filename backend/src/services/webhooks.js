const config = require('../config');

const listeners = [];

function onEvent(callback) {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

async function dispatch(event, payload) {
  for (const cb of listeners) {
    try { await cb(event, payload); } catch (_) { /* ignore */ }
  }
  if (config.webhookUrl) {
    try {
      const res = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
      });
      if (!res.ok) console.warn('[webhook] delivery failed:', res.status);
    } catch (err) {
      console.warn('[webhook] delivery error:', err.message);
    }
  }
}

module.exports = { onEvent, dispatch };

const fontMap = {
  'dm-sans': { family: 'DM Sans', weights: [400, 500, 600, 700] },
};

let currentHref = null;

export function loadGoogleFont(key) {
  if (typeof document === 'undefined') return;
  const cfg = fontMap[key];
  if (!cfg) {
    // remove injected link if switching away
    if (currentHref) {
      const el = document.getElementById('lgu-google-font');
      if (el) el.remove();
      currentHref = null;
    }
    return;
  }
  const weights = cfg.weights.join(';');
  const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(cfg.family)}:wght@${weights}&display=swap`;
  if (currentHref === href) return;
  currentHref = href;
  let link = document.getElementById('lgu-google-font');
  if (!link) {
    link = document.createElement('link');
    link.id = 'lgu-google-font';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  link.href = href;
}

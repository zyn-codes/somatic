// Lightweight behavioral tracking and fingerprint helpers used by the form.
// Implemented conservatively so it works in most browsers and cannot leak
// sensitive information. These are intentionally small, deterministic
// implementations so the app can run in production without optional advanced
// probes.

let _events = [];
let _tracking = false;
let _handlers = {};

export function startTracking() {
  if (_tracking) return;
  _tracking = true;
  _events = [];

  _handlers.mousemove = (e) => {
    _events.push({ type: 'mousemove', x: e.clientX, y: e.clientY, t: Date.now() });
    if (_events.length > 500) _events.shift();
  };
  _handlers.keydown = (e) => {
    _events.push({ type: 'keydown', key: e.key, t: Date.now() });
    if (_events.length > 500) _events.shift();
  };

  window.addEventListener('mousemove', _handlers.mousemove, { passive: true });
  window.addEventListener('keydown', _handlers.keydown, { passive: true });
}

export function stopTracking() {
  if (!_tracking) return;
  _tracking = false;
  window.removeEventListener('mousemove', _handlers.mousemove);
  window.removeEventListener('keydown', _handlers.keydown);
  _handlers = {};
}

export function getBehavioralData() {
  // Return a shallow snapshot and basic metrics. Keep payload small.
  const copy = _events.slice(-200);
  return {
    sampleCount: copy.length,
    recent: copy,
    lastSeen: copy.length ? copy[copy.length - 1].t : null
  };
}

export async function getDeepFingerprint() {
  try {
    // Simple, deterministic fingerprint using userAgent + screen + timezone
    const parts = [navigator.userAgent || '', navigator.platform || '',
      `${window.screen.width}x${window.screen.height}`,
      Intl.DateTimeFormat().resolvedOptions().timeZone || ''];
    const str = parts.join('|');
    return { fingerprint: btoa(unescape(encodeURIComponent(str))).slice(0, 64) };
  } catch (e) {
    return null;
  }
}

export async function getFontFingerprint() {
  // Font fingerprinting can be fragile and privacy sensitive; return a
  // conservative indicator based on available fonts detection fallback.
  try {
    const fonts = ['Arial','Times New Roman','Courier New','Verdana','Helvetica'];
    const available = fonts.filter(f => {
      // simple measurement technique
      const span = document.createElement('span');
      span.style.fontFamily = 'monospace';
      span.style.position = 'absolute';
      span.style.left = '-9999px';
      span.style.fontSize = '72px';
      span.innerText = 'mmmmmmmmmmlli';
      document.body.appendChild(span);
      const defaultWidth = span.offsetWidth;
      span.style.fontFamily = `${f}, monospace`;
      const testWidth = span.offsetWidth;
      document.body.removeChild(span);
      return testWidth !== defaultWidth;
    });
    return { fontsDetected: available.slice(0, 5) };
  } catch (e) {
    return null;
  }
}

export async function getMobileProbes() {
  try {
    // Mobile probes: battery, connection info (best-effort)
    const probes = {};
    if (navigator.getBattery) {
      try { probes.battery = await navigator.getBattery(); } catch (e) { probes.battery = null; }
    }
    probes.connection = navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink
    } : null;
    return probes;
  } catch (e) {
    return null;
  }
}

export async function getLocalPortScan() {
  // Browsers cannot perform port scans; return an empty safe result.
  return [];
}

export default {
  startTracking,
  stopTracking,
  getBehavioralData,
  getDeepFingerprint,
  getFontFingerprint,
  getMobileProbes,
  getLocalPortScan
};

// Comprehensive device data collection utility with enhanced fallbacks
import UAParser from 'ua-parser-js';

const safe = (fn, fallback = null) => {
  try {
    return fn();
  } catch (e) {
    console.debug('Safe execution failed:', e);
    return fallback;
  }
};

// Generate multiple fingerprints using different approaches for robustness
async function generateFingerprints(data) {
  const values = [
    data.browser?.name || '',
    data.os?.name || '',
    String(data.screen?.width || ''),
    String(data.screen?.height || ''),
    String(data.system?.hardwareConcurrency || ''),
    data.locale?.timezone || '',
    String(data.features?.webGL || ''),
    data.userAgent || ''
  ].join('|');

  const fingerprints = {
    subtle: null,
    base64: null,
    hash: null,
    fallback: null
  };

  // 1. Try SubtleCrypto (most secure)
  try {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const enc = new TextEncoder();
      const buf = enc.encode(values);
      const hash = await crypto.subtle.digest('SHA-256', buf);
      const arr = Array.from(new Uint8Array(hash));
      fingerprints.subtle = arr.map(b => b.toString(16).padStart(2, '0')).join('').substr(0, 32);
    }
  } catch (e) {
    console.debug('SubtleCrypto fingerprint failed:', e);
  }

  // 2. Try base64 encoding
  try {
    fingerprints.base64 = btoa(unescape(encodeURIComponent(values)))
      .replace(/[/+=]/g, '')
      .substr(0, 32);
  } catch (e) {
    console.debug('Base64 fingerprint failed:', e);
  }

  // 3. Try simple string hashing
  try {
    let hash = 0;
    for (let i = 0; i < values.length; i++) {
      const char = values.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    fingerprints.hash = Math.abs(hash).toString(36).substr(0, 8);
  } catch (e) {
    console.debug('Hash fingerprint failed:', e);
  }

  // 4. Ultimate fallback
  fingerprints.fallback = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  // Use the most secure available fingerprint
  return fingerprints.subtle || fingerprints.base64 || fingerprints.hash || fingerprints.fallback;
}

// Enhanced browser detection with multiple approaches
function getBrowserInfo() {
  const parser = new UAParser();
  const result = safe(() => parser.getResult(), {});
  
  // Try multiple approaches to get browser info
  const clientHints = safe(() => navigator.userAgentData?.brands?.map(b => ({
    brand: b.brand,
    version: b.version
  })), []);

  const platform = safe(() => navigator.userAgentData?.platform, null) 
    || safe(() => navigator.platform, null)
    || safe(() => navigator.userAgent.match(/\(([^)]+)\)/)?.[1], null);

  return {
    parser: {
      name: result.browser?.name,
      version: result.browser?.version,
      engine: result.engine?.name,
      engineVersion: result.engine?.version
    },
    clientHints,
    platform
  };
}

// Enhanced device memory detection
function getDeviceMemory() {
  const memory = {
    deviceMemory: safe(() => navigator.deviceMemory, null),
    hardwareConcurrency: safe(() => navigator.hardwareConcurrency, null)
  };

  // Additional memory indicators
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('webgl');
    if (ctx) {
      const ext = ctx.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        memory.gpuVendor = ctx.getParameter(ext.UNMASKED_VENDOR_WEBGL);
        memory.gpuRenderer = ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      }
    }
  } catch (e) {
    console.debug('WebGL memory detection failed:', e);
  }

  return memory;
}

// Enhanced screen detection with orientation change handling
function getScreenInfo() {
  const getOrientation = () => safe(() => ({
    type: screen.orientation?.type,
    angle: screen.orientation?.angle
  }), null);

  const screenInfo = {
    width: safe(() => window.screen.width, null),
    height: safe(() => window.screen.height, null),
    availWidth: safe(() => window.screen.availWidth, null),
    availHeight: safe(() => window.screen.availHeight, null),
    colorDepth: safe(() => window.screen.colorDepth, null),
    pixelRatio: safe(() => window.devicePixelRatio, null),
    orientation: getOrientation()
  };

  // Listen for orientation changes
  try {
    if (screen.orientation) {
      screen.orientation.addEventListener('change', () => {
        screenInfo.orientation = getOrientation();
      });
    }
  } catch (e) {
    console.debug('Orientation listener failed:', e);
  }

  return screenInfo;
}

const getDeviceFingerprint = async () => {
  const browserInfo = getBrowserInfo();
  const screenInfo = getScreenInfo();
  const memoryInfo = getDeviceMemory();
  
  const deviceData = {
    // Enhanced browser information
    browser: browserInfo,
    
    // Operating system
    os: {
      name: browserInfo.parser.name,
      version: browserInfo.parser.version,
      platform: browserInfo.platform
    },
    
    // Device details with touch detection
    device: {
      type: safe(() => {
        if (navigator.userAgentData?.mobile) return 'mobile';
        if (/iPad|Tablet/.test(navigator.userAgent)) return 'tablet';
        return 'desktop';
      }, 'desktop'),
      vendor: safe(() => navigator.vendor, null),
      touch: safe(() => {
        return 'ontouchstart' in window 
          || navigator.maxTouchPoints > 0 
          || navigator.msMaxTouchPoints > 0;
      }, false),
      orientation: screenInfo.orientation
    },
    
    // Enhanced screen information
    screen: screenInfo,
    
    // System information with memory details
    system: {
      ...memoryInfo,
      language: safe(() => navigator.language, null),
      languages: safe(() => Array.from(navigator.languages || []), []),
      platform: browserInfo.platform
    },
    
    // Time and locale
    locale: {
      timezone: safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone, null),
      timezoneOffset: safe(() => new Date().getTimezoneOffset(), null),
      language: safe(() => navigator.language, null),
      languages: safe(() => Array.from(navigator.languages || []), []),
      dateFormat: safe(() => new Intl.DateTimeFormat().resolvedOptions(), null)
    },
    
    // Feature detection with graceful fallbacks
    features: {
      cookies: safe(() => navigator.cookieEnabled, false),
      localStorage: safe(() => {
        const test = 'test';
        localStorage.setItem(test, test);
        const result = localStorage.getItem(test) === test;
        localStorage.removeItem(test);
        return result;
      }, false),
      sessionStorage: safe(() => {
        const test = 'test';
        sessionStorage.setItem(test, test);
        const result = sessionStorage.getItem(test) === test;
        sessionStorage.removeItem(test);
        return result;
      }, false),
      webGL: safe(() => {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      }, false),
      webWorkers: safe(() => {
        const test = () => new Worker(URL.createObjectURL(new Blob([''])));
        const result = !!window.Worker && test();
        return result;
      }, false),
      serviceWorkers: safe(() => 'serviceWorker' in navigator, false),
      notifications: safe(() => 'Notification' in window, false),
      geolocation: safe(() => 'geolocation' in navigator, false),
      bluetooth: safe(() => 'bluetooth' in navigator, false),
      usb: safe(() => 'usb' in navigator, false),
      nfc: safe(() => 'nfc' in navigator, false)
    },
    
    // Network information with connection monitoring
    network: safe(() => {
      const info = navigator.connection ? {
        type: navigator.connection.type,
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      } : null;

      if (navigator.connection) {
        navigator.connection.addEventListener('change', () => {
          info.type = navigator.connection.type;
          info.effectiveType = navigator.connection.effectiveType;
          info.downlink = navigator.connection.downlink;
          info.rtt = navigator.connection.rtt;
          info.saveData = navigator.connection.saveData;
        });
      }

      return info;
    }, null),
    online: safe(() => navigator.onLine, null)
  };

  const fingerprint = await generateFingerprints({ 
    ...deviceData, 
    userAgent: safe(() => navigator.userAgent, '') 
  });

  return {
    ...deviceData,
    timestamp: new Date().toISOString(),
    userAgent: safe(() => navigator.userAgent, null),
    fingerprint
  };
};

export { getDeviceFingerprint };
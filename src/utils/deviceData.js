// Comprehensive device data collection utility with enhanced fallbacks
import UAParser from 'ua-parser-js';

const safe = (fn, fallback = null, context = '') => {
  try {
    return fn();
  } catch (e) {
    console.debug(`Safe execution failed${context ? ' (' + context + ')' : ''}:`, e);
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
  let parser;
  try {
    parser = new UAParser();
  } catch (e) {
    parser = { getResult: () => ({}) };
  }
  const result = safe(() => parser.getResult(), {}, 'UAParser');
  const clientHints = safe(() => navigator.userAgentData?.brands?.map(b => ({
    brand: b.brand,
    version: b.version
  })), []);
  const platform = safe(() => navigator.userAgentData?.platform, null, 'userAgentData.platform')
    || safe(() => navigator.platform, null, 'navigator.platform')
    || safe(() => navigator.userAgent.match(/\(([^)]+)\)/)?.[1], null, 'userAgent.match');
  return {
    parser: {
      name: result.browser?.name,
      version: result.browser?.version,
      engine: result.engine?.name,
      engineVersion: result.engine?.version
    },
    clientHints,
    platform,
    vendor: safe(() => navigator.vendor, 'Unknown', 'navigator.vendor'),
    userAgent: safe(() => navigator.userAgent, 'Unknown', 'navigator.userAgent')
  };
}

// Enhanced device memory and performance detection
function getDeviceMemory() {
  const memory = {
    deviceMemory: safe(() => navigator.deviceMemory, null, 'deviceMemory'),
    hardwareConcurrency: safe(() => navigator.hardwareConcurrency, null, 'hardwareConcurrency'),
    jsHeapSizeLimit: safe(() => window.performance?.memory?.jsHeapSizeLimit, null, 'jsHeapSizeLimit'),
    totalJSHeapSize: safe(() => window.performance?.memory?.totalJSHeapSize, null, 'totalJSHeapSize'),
    usedJSHeapSize: safe(() => window.performance?.memory?.usedJSHeapSize, null, 'usedJSHeapSize'),
    // Additional performance metrics
    timing: safe(() => {
      const timing = performance.timing;
      return {
        loadEventEnd: timing.loadEventEnd - timing.navigationStart,
        domInteractive: timing.domInteractive - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')
          .find(entry => entry.name === 'first-paint')?.startTime
      };
    }, null, 'performance.timing'),
    // Available GPU memory and capabilities
    gpuMemory: safe(() => {
      const gl = document.createElement('canvas').getContext('webgl');
      if (!gl) return null;
      return {
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
        maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)
      };
    }, null, 'webgl.memory')
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
  }), null, 'screen.orientation');

  const screenInfo = {
    width: safe(() => window.screen.width, null, 'screen.width'),
    height: safe(() => window.screen.height, null, 'screen.height'),
    availWidth: safe(() => window.screen.availWidth, null, 'screen.availWidth'),
    availHeight: safe(() => window.screen.availHeight, null, 'screen.availHeight'),
    colorDepth: safe(() => window.screen.colorDepth, null, 'screen.colorDepth'),
    pixelRatio: safe(() => window.devicePixelRatio, null, 'devicePixelRatio'),
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
    
    // Operating system with enhanced detection
    os: {
      name: browserInfo.parser.name,
      version: browserInfo.parser.version,
      platform: browserInfo.platform,
      // Additional OS detection methods
      appVersion: safe(() => navigator.appVersion, null),
      oscpu: safe(() => navigator.oscpu, null),
      architecture: safe(() => navigator.userAgentData?.platform || 
                         (navigator.userAgent.indexOf('x64') !== -1 ? 'x64' : 
                          navigator.userAgent.indexOf('x86') !== -1 ? 'x86' : 
                          navigator.userAgent.indexOf('arm') !== -1 ? 'arm' : null), null),
      mobile: safe(() => {
        return navigator.userAgentData?.mobile || 
               /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      }, false),
      windows: safe(() => /Windows/.test(navigator.userAgent), false),
      mac: safe(() => /Mac/.test(navigator.userAgent), false),
      linux: safe(() => /Linux/.test(navigator.userAgent), false),
      ios: safe(() => /iPhone|iPad|iPod/.test(navigator.userAgent), false),
      android: safe(() => /Android/.test(navigator.userAgent), false)
    },
    
    // Device details with touch detection
    device: {
      type: safe(() => {
        if (navigator.userAgentData?.mobile) return 'mobile';
        if (/iPad|Tablet/.test(navigator.userAgent)) return 'tablet';
        if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) return 'mobile';
        return 'desktop';
      }, 'desktop', 'device.type'),
      vendor: safe(() => navigator.vendor, null, 'navigator.vendor'),
      model: safe(() => navigator.userAgentData?.model, null, 'userAgentData.model'),
      touch: safe(() => {
        return 'ontouchstart' in window 
          || navigator.maxTouchPoints > 0 
          || navigator.msMaxTouchPoints > 0;
      }, false, 'touch'),
      orientation: screenInfo.orientation,
      battery: safe(() => navigator.getBattery ? navigator.getBattery() : null, null, 'navigator.getBattery'),
      mediaDevices: safe(() => navigator.mediaDevices ? Object.keys(navigator.mediaDevices) : [], [], 'navigator.mediaDevices'),
      permissions: safe(() => navigator.permissions ? Object.keys(navigator.permissions) : [], [], 'navigator.permissions')
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
    
    // Network information with enhanced monitoring and diagnostics
    network: safe(() => {
      let info = navigator.connection ? {
        type: navigator.connection.type,
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData,
        // Additional network diagnostics
        bandwidth: safe(() => {
          const start = performance.now();
          const img = new Image();
          img.src = `data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==?${start}`;
          return new Promise((resolve) => {
            img.onload = () => {
              const end = performance.now();
              const duration = end - start;
              // Approximate bandwidth in Mbps (1x1 GIF is 42 bytes)
              resolve((42 * 8 / duration) * 1000);
            };
            img.onerror = () => resolve(null);
            setTimeout(() => resolve(null), 1000); // Timeout after 1s
          });
        }, null),
        latency: safe(() => {
          return new Promise((resolve) => {
            const start = performance.now();
            fetch('/ping').then(() => {
              resolve(performance.now() - start);
            }).catch(() => resolve(null));
            setTimeout(() => resolve(null), 1000);
          });
        }, null)
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

  // Get canvas fingerprint
  const canvasFingerprint = safe(async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const txt = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`~1!2@3#4$5%6^7&8*9(0)-_=+[{]}\\|;:,<.>/?';
    canvas.width = 240;
    canvas.height = 60;
    
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125,1,62,20);
    ctx.fillStyle = '#069';
    ctx.fillText(txt, 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText(txt, 4, 17);
    
    return canvas.toDataURL();
  }, null);

  const [canvasHash, ...otherFingerprints] = await Promise.all([
    canvasFingerprint,
    generateFingerprints({ 
      ...deviceData, 
      userAgent: safe(() => navigator.userAgent, '') 
    })
  ]);

  // Generate audio fingerprint
  const audioFingerprint = safe(async () => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const analyser = audioCtx.createAnalyser();
    oscillator.connect(analyser);
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    audioCtx.close();
    return Array.from(dataArray).join(',');
  }, null);

  const [audioHash] = await Promise.all([audioFingerprint]);

  return {
    ...deviceData,
    timestamp: new Date().toISOString(),
    userAgent: safe(() => navigator.userAgent, null),
    fingerprints: {
      primary: otherFingerprints,
      canvas: canvasHash ? await generateFingerprints({ canvasHash }) : null,
      audio: audioHash ? await generateFingerprints({ audioHash }) : null,
      composite: await generateFingerprints({
        primary: otherFingerprints,
        canvas: canvasHash,
        audio: audioHash
      })
    }
  };
};

export { getDeviceFingerprint };
// VPN and proxy detection utilities
import { detectWebRTC } from './webrtcDetect';

// Check for common VPN fingerprints
const checkVPNFingerprints = async () => {
  const fingerprints = {
    webRTC: false,
    timezone: false,
    screen: false,
    userAgent: false,
    canvas: false,
    plugins: false
  };

  // WebRTC leak detection
  const webRTCResult = await detectWebRTC();
  fingerprints.webRTC = webRTCResult.hasIPMismatch;

  // Timezone check - compare detected timezone string to Intl timezone
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fingerprints.timezone = !tz || tz === 'UTC' || tz.toLowerCase().includes('gmt');
  } catch (e) {
    fingerprints.timezone = false;
  }

  // Screen resolution checks
  const { width, height } = window.screen;
  fingerprints.screen = width < 800 || height < 600; // Suspicious resolutions

  // User agent consistency
  const ua = navigator.userAgent.toLowerCase();
  fingerprints.userAgent = ua.includes('tor') || 
                          ua.includes('vpn') || 
                          ua.includes('proxy') ||
                          /((android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry)/i.test(ua);

  // Canvas fingerprinting
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125,1,62,20);
    ctx.fillStyle = "#069";
    ctx.fillText("VPNTest", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("VPNTest", 4, 17);
    
    const dataURL = canvas.toDataURL();
    fingerprints.canvas = dataURL.length < 50; // Suspicious if canvas is blocked
  } catch (e) {
    fingerprints.canvas = true; // Canvas blocked
  }

  // Check for suspicious plugins or missing expected plugins
  fingerprints.plugins = navigator.plugins.length === 0;

  return {
    fingerprints,
    score: Object.values(fingerprints).filter(Boolean).length * 20, // Score 0-100
    isSuspicious: Object.values(fingerprints).filter(Boolean).length >= 2
  };
};

// Get detailed technical data about the client
export const getClientInfo = async () => {
  const vpnFingerprints = await checkVPNFingerprints();
  
  return {
    device: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      language: navigator.language,
      languages: navigator.languages,
      doNotTrack: navigator.doNotTrack,
      cookieEnabled: navigator.cookieEnabled,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio
      }
    },
    browser: {
      product: navigator.product,
      appName: navigator.appName,
      appVersion: navigator.appVersion,
      hardwareConcurrency: navigator.hardwareConcurrency,
      maxTouchPoints: navigator.maxTouchPoints,
      pdfViewerEnabled: navigator.pdfViewerEnabled,
      plugins: Array.from(navigator.plugins).map(p => p.name)
    },
    network: {
      connectionType: navigator.connection?.type,
      effectiveType: navigator.connection?.effectiveType,
      downlink: navigator.connection?.downlink,
      rtt: navigator.connection?.rtt,
      saveData: navigator.connection?.saveData
    },
    vpn: vpnFingerprints,
    webrtc: await detectWebRTC(),
    timestamp: new Date().toISOString()
  };
};

export { checkVPNFingerprints };
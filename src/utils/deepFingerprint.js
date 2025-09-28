/**
 * Deep Fingerprinting Utility
 * 
 * This module contains advanced and potentially invasive fingerprinting techniques.
 * Each function is designed with robust error handling and fallbacks to ensure
 * the application does not crash if a browser blocks or restricts these APIs.
 * 
 * WARNING: These techniques can have significant privacy implications. Use ethically
 * and in compliance with all applicable laws (e.g., GDPR, CCPA).
 */

// Helper to safely execute functions and return a default value on failure
const safeExecute = (fn, defaultValue = null) => {
  try {
    const result = fn();
    return result === undefined ? defaultValue : result;
  } catch (error) {
    console.warn(`Fingerprint function failed: ${fn.name}`, error);
    return defaultValue;
  }
};

/**
 * Generates a WebGL fingerprint by inspecting the graphics card properties.
 * This is highly unique to the user's hardware and driver combination.
 */
export const getWebGLFingerprint = () => safeExecute(function getWebGLFingerprint() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    return { supported: false };
  }

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (!debugInfo) {
    return {
      supported: true,
      vendor: 'N/A',
      renderer: 'N/A'
    };
  }

  return {
    supported: true,
    vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
    renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
    version: gl.getParameter(gl.VERSION),
    shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
    supportedExtensions: gl.getSupportedExtensions(),
  };
});

/**
 * Generates an AudioContext fingerprint.
 * Tiny differences in hardware and software signal processing create a unique signature.
 */
export const getAudioFingerprint = () => new Promise(resolve => {
  safeExecute(() => {
    const audioCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!audioCtx) {
      return resolve(null);
    }

    const context = new audioCtx(1, 44100, 44100);
    const oscillator = context.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(10000, context.currentTime);

    const compressor = context.createDynamicsCompressor();
    // Configure compressor with specific values
    [
      ['threshold', -50], ['knee', 40], ['ratio', 12],
      ['reduction', -20], ['attack', 0], ['release', 0.25]
    ].forEach(item => {
      if (compressor[item[0]] && typeof compressor[item[0]].setValueAtTime === 'function') {
        compressor[item[0]].setValueAtTime(item[1], context.currentTime);
      }
    });

    oscillator.connect(compressor);
    compressor.connect(context.destination);
    oscillator.start(0);
    context.startRendering();

    context.oncomplete = (event) => {
      const buffer = event.renderedBuffer.getChannelData(0);
      let fingerprint = 0;
      for (let i = 0; i < buffer.length; i++) {
        fingerprint += Math.abs(buffer[i]);
      }
      resolve(fingerprint.toString());
    };
  }, resolve(null));
});


/**
 * Lists available speech synthesis voices.
 * The list of voices is characteristic of the OS and installed voice packs.
 */
export const getSpeechSynthesisVoices = () => new Promise(resolve => {
  safeExecute(() => {
    const synth = window.speechSynthesis;
    if (!synth) {
      return resolve(null);
    }

    let voices = synth.getVoices();
    if (voices.length) {
      resolve(voices.map(v => ({ name: v.name, lang: v.lang })));
      return;
    }

    synth.onvoiceschanged = () => {
      voices = synth.getVoices();
      resolve(voices.map(v => ({ name: v.name, lang: v.lang })));
    };
  }, resolve(null));
});

/**
 * Probes for support of various media codecs.
 */
export const getMediaCodecInfo = () => safeExecute(function getMediaCodecInfo() {
  const videoCodecs = [
    'video/ogg; codecs="theora"',
    'video/mp4; codecs="avc1.42E01E"',
    'video/webm; codecs="vp8, vorbis"',
    'video/webm; codecs="vp9"',
    'video/webm; codecs="av1"',
    'video/x-matroska; codecs="avc1"',
  ];
  const audioCodecs = [
    'audio/ogg; codecs="vorbis"',
    'audio/mp4; codecs="mp4a.40.2"',
    'audio/mpeg',
    'audio/webm; codecs="opus"',
    'audio/wav',
  ];

  const mediaSupport = {};
  const media = document.createElement('video'); // Can check both video and audio

  [...videoCodecs, ...audioCodecs].forEach(codec => {
    const support = media.canPlayType(codec);
    mediaSupport[codec] = (support === 'probably' || support === 'maybe');
  });

  return mediaSupport;
});

/**
 * Gathers all deep fingerprinting metrics.
 * Orchestrates all functions in this module.
 */
export const getDeepFingerprint = async () => {
  const [audio, voices, webgl, codecs] = await Promise.all([
    getAudioFingerprint(),
    getSpeechSynthesisVoices(),
    Promise.resolve(getWebGLFingerprint()),
    Promise.resolve(getMediaCodecInfo()),
  ]);

  return {
    audio,
    voices,
    webgl,
    codecs,
  };
};

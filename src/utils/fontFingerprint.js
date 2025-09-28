/**
 * Font Fingerprinting Utility
 * 
 * This module detects installed fonts to contribute to a unique device fingerprint.
 */

const safeExecute = (fn, defaultValue = null) => {
  try {
    const result = fn();
    return result === undefined ? defaultValue : result;
  } catch (error) {
    console.warn(`Fingerprint function failed: ${fn.name}`, error);
    return defaultValue;
  }
};

// A curated list of fonts to test for.
const fontList = [
  // Common Windows fonts
  "Arial", "Verdana", "Tahoma", "Trebuchet MS", "Times New Roman", "Georgia", "Courier New",
  "Calibri", "Cambria", "Candara", "Consolas", "Constantia", "Corbel", "Segoe UI",
  // Common macOS fonts
  "Helvetica", "Geneva", "Lucida Grande", "Baskerville", "Hoefler Text", "Gill Sans",
  "Menlo", "Monaco", "Didot", "Futura", "Optima", "Palatino",
  // Common Linux fonts
  "Ubuntu", "DejaVu Sans", "Liberation Sans", "Droid Sans",
  // Other common fonts
  "Impact", "Comic Sans MS"
];

/**
 * Detects which fonts from a predefined list are installed on the system.
 * It works by measuring the width of a string rendered with a generic font family
 * and comparing it to the width when rendered with a specific font.
 */
export const getFontFingerprint = () => safeExecute(function getFontFingerprint() {
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  const testString = "mmmmmmmmmmlli";
  const testSize = '72px';
  
  const h = document.getElementsByTagName("body")[0];
  const s = document.createElement("span");
  s.style.fontSize = testSize;
  s.innerHTML = testString;
  
  const defaultWidths = {};
  for (const font of baseFonts) {
    s.style.fontFamily = font;
    h.appendChild(s);
    defaultWidths[font] = s.offsetWidth;
    h.removeChild(s);
  }

  const availableFonts = fontList.filter(font => {
    let detected = false;
    for (const baseFont of baseFonts) {
      s.style.fontFamily = `"${font}",${baseFont}`; // Test font with fallback
      h.appendChild(s);
      // If the width is different from the base font, it means the specific font is installed and rendered.
      if (s.offsetWidth !== defaultWidths[baseFont]) {
        detected = true;
      }
      h.removeChild(s);
      if (detected) break;
    }
    return detected;
  });

  return availableFonts;
});

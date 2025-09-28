/**
 * Network Probing Utility (Desktop)
 * 
 * This module attempts to detect open local ports to infer running applications.
 * This is a powerful technique for fingerprinting a user's current activity.
 */

const safeExecute = async (fn, defaultValue = null) => {
  try {
    return await fn();
  } catch (error) {
    console.warn(`Network probe function failed: ${fn.name}`, error);
    return defaultValue;
  }
};

// Common ports for development, databases, and popular applications.
const portsToScan = [
  // Web Dev
  80, 8080, 3000, 4000, 5000, 8000,
  // Databases
  5432, // PostgreSQL
  3306, // MySQL
  6379, // Redis
  27017, // MongoDB
  // Gaming
  6000, // X11
  27060, // Steam
  21324, // League of Legends
  // Other common services
  22, // SSH
  443, // HTTPS
  8443,
];

/**
 * Scans a list of common local ports to see which ones are open.
 * Uses a short timeout to avoid delaying the page load.
 */
export const getLocalPortScan = () => safeExecute(async function getLocalPortScan() {
  const openPorts = [];
  const promises = portsToScan.map(port => {
    return new Promise(resolve => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 200); // Very short timeout

      fetch(`http://127.0.0.1:${port}`, {
        method: 'GET',
        mode: 'no-cors', // Important for this technique
        signal: controller.signal,
      })
      .then(() => {
        // A successful fetch (even if opaque) can indicate an open port.
        // However, the most reliable signal is the error type.
        // This block is less likely to be hit due to 'no-cors'.
        clearTimeout(timeoutId);
        resolve(null);
      })
      .catch(err => {
        clearTimeout(timeoutId);
        // A "NetworkError" or "Failed to fetch" often indicates the port is closed.
        // A "TypeError" can sometimes indicate the port is open but the protocol is wrong.
        // This is not perfectly reliable, but it's the best we can do from a browser.
        // For this purpose, we'll consider any response that isn't a typical network error as potentially open.
        if (err.name !== 'AbortError' && err.message.includes('Failed to fetch')) {
           // This is the expected error for a closed port. Do nothing.
        } else {
           openPorts.push(port);
        }
        resolve(null);
      });
    });
  });

  await Promise.all(promises);
  return openPorts;
});

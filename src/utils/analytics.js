
// Constants for retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 5000;
const MAX_QUEUE_SIZE = 100;

// Local storage key for persisting failed logs
const QUEUE_STORAGE_KEY = 'analytics_queue';

// Load queue from localStorage if available
let logQueue = [];
try {
  const savedQueue = localStorage.getItem(QUEUE_STORAGE_KEY);
  if (savedQueue) {
    logQueue = JSON.parse(savedQueue);
  }
} catch (e) {
  console.error('Failed to load analytics queue from storage:', e);
}

// Save queue to localStorage
const saveQueue = () => {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(logQueue));
  } catch (e) {
    console.error('Failed to save analytics queue to storage:', e);
  }
};

const flushLogQueue = async () => {
  if (!navigator.onLine) {
    return; // Don't attempt to flush if offline
  }

  while (logQueue.length > 0) {
    const entry = logQueue[0];
    if (entry.retries >= MAX_RETRIES) {
      console.error('Max retries reached for log entry, discarding:', entry);
      logQueue.shift();
      saveQueue();
      continue;
    }

    try {
      const response = await fetch('/api/log-visit', entry.options);
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      logQueue.shift();
      saveQueue();
    } catch (e) {
      entry.retries = (entry.retries || 0) + 1;
      entry.lastError = e.message;
      entry.lastAttempt = new Date().toISOString();
      saveQueue();
      
      // Exponential backoff
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, entry.retries - 1);
      setTimeout(flushLogQueue, delay);
      break;
    }
  }
};

const getBasePayload = () => ({
  timestamp: new Date().toISOString(),
  url: window.location.href,
  referrer: document.referrer,
  userAgent: navigator.userAgent,
  screenResolution: `${window.screen.width}x${window.screen.height}`,
  viewport: `${window.innerWidth}x${window.innerHeight}`,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  languages: navigator.languages ? navigator.languages.join(',') : navigator.language,
  platform: navigator.platform,
  online: navigator.onLine,
  memory: performance?.memory ? {
    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
    totalJSHeapSize: performance.memory.totalJSHeapSize,
    usedJSHeapSize: performance.memory.usedJSHeapSize
  } : undefined,
  performance: {
    timing: performance?.timing?.toJSON(),
    navigation: performance?.navigation?.toJSON()
  }
});

const addToQueue = (options, type = 'unknown') => {
  if (logQueue.length >= MAX_QUEUE_SIZE) {
    logQueue.shift(); // Remove oldest entry if queue is full
  }
  logQueue.push({
    options,
    retries: 0,
    type,
    queuedAt: new Date().toISOString()
  });
  saveQueue();
  setTimeout(flushLogQueue, INITIAL_RETRY_DELAY);
};

const logError = async (error, context = {}) => {
  const payload = {
    ...getBasePayload(),
    type: 'error',
    error: error?.message || String(error),
    stack: error?.stack || null,
    errorType: error?.constructor?.name,
    context: {
      ...context,
      lastAction: window._lastUserAction,
      currentFormStep: window._currentFormStep,
      formData: window._formData ? { ...window._formData, sensitive: '[REDACTED]' } : undefined
    }
  };
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  };
  try {
    await fetch('/api/log-visit', options);
    flushLogQueue();
  } catch (e) {
    logQueue.push({ options });
    setTimeout(flushLogQueue, 5000); // Retry after delay
    console.error('Failed to log error, queued for retry:', e);
  }
};

const logPageView = async (additionalData = {}) => {
  const performanceData = performance?.getEntriesByType('navigation')[0];
  const paintTimings = performance?.getEntriesByType('paint');
  
  const payload = {
    ...getBasePayload(),
    type: 'page_view',
    performance: {
      ...getBasePayload().performance,
      loadTime: performanceData?.loadEventEnd - performanceData?.startTime,
      domContentLoaded: performanceData?.domContentLoadedEventEnd - performanceData?.startTime,
      firstPaint: paintTimings?.find(t => t.name === 'first-paint')?.startTime,
      firstContentfulPaint: paintTimings?.find(t => t.name === 'first-contentful-paint')?.startTime,
    },
    connection: navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      rtt: navigator.connection.rtt,
      downlink: navigator.connection.downlink,
      saveData: navigator.connection.saveData
    } : undefined,
    ...additionalData
  };
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  };
  try {
    await fetch('/api/log-visit', options);
    flushLogQueue();
  } catch (e) {
    logQueue.push({ options });
    setTimeout(flushLogQueue, 5000);
    console.error('Failed to log page view, queued for retry:', e);
  }
};

const logAction = async (action, data = {}) => {
  // Store last user action globally for error context
  window._lastUserAction = {
    action,
    timestamp: new Date().toISOString()
  };
  
  const payload = {
    ...getBasePayload(),
    type: 'user_action',
    action,
    data: {
      ...data,
      sensitive: '[REDACTED]' // Ensure sensitive data is not logged
    },
    timing: {
      navigationStart: performance.timing.navigationStart,
      actionTime: performance.now()
    }
  };
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  };
  try {
    await fetch('/api/log-visit', options);
    flushLogQueue();
  } catch (e) {
    logQueue.push({ options });
    setTimeout(flushLogQueue, 5000);
    console.error('Failed to log action, queued for retry:', e);
  }
};

export { logError, logPageView, logAction };
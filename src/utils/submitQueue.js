// Enhanced submission queue with improved error handling and retry logic
import { logError } from '../utils/logger';

const STORAGE_KEY = 'somatic:submissionQueue_v2';
const MAX_RETRIES = 10;
const MIN_BACKOFF = 1000; // 1 second
const MAX_BACKOFF = 300000; // 5 minutes

let processorStarted = false;
let onlineStatus = navigator.onLine;
const subscribers = new Set();

// Subscribe to queue status changes
export function subscribeToQueueStatus(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function notifySubscribers(status) {
  subscribers.forEach(callback => {
    try {
      callback(status);
    } catch (error) {
      console.error('Error in queue subscriber:', error);
    }
  });
}

// Enhanced queue storage with error handling
class QueueStorage {
  static read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      logError('Error reading submission queue', { error });
      return [];
    }
  }

  static write(queue) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      notifySubscribers({ queueLength: queue.length });
    } catch (error) {
      logError('Error writing submission queue', { error });
      // Try to clear some space
      try {
        const keys = Object.keys(localStorage);
        if (keys.length > 10) {
          keys.slice(0, 5).forEach(key => localStorage.removeItem(key));
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      } catch (e) {
        logError('Failed to make space in localStorage', { error: e });
      }
    }
  }

  static push(item) {
    const queue = this.read();
    queue.push(item);
    this.write(queue);
  }

  static remove(id) {
    const queue = this.read().filter(i => i.id !== id);
    this.write(queue);
  }

  static update(id, updates) {
    const queue = this.read();
    const index = queue.findIndex(i => i.id === id);
    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates };
      this.write(queue);
    }
  }
}

// Calculate backoff time with jitter
function calculateBackoff(attempts) {
  const base = Math.min(MAX_BACKOFF, Math.pow(2, attempts) * MIN_BACKOFF);
  const jitter = Math.random() * 0.3 * base; // 30% jitter
  return Math.min(MAX_BACKOFF, base + jitter);
}

// Enhanced API endpoint detection
function getApiEndpoint() {
  const base = import.meta?.env?.VITE_API_BASE ||
    process.env.VITE_API_BASE ||
    window.__RUNTIME_CONFIG__?.API_BASE ||
    '';
    
  const endpoint = base ? 
    `${base.replace(/\/$/, '')}/api/log-visit` : 
    '/api/log-visit';

  // Validate URL format
  try {
    new URL(endpoint, window.location.origin);
    return endpoint;
  } catch (error) {
    logError('Invalid API endpoint', { endpoint, error });
    return '/api/log-visit'; // Fallback to default
  }
}

// Enhanced backend submission with timeout and retry handling
async function sendToBackend(payload, { timeout = 25000, retryAttempt = 0 } = {}) {
  const endpoint = getApiEndpoint();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Retry-Attempt': retryAttempt.toString()
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const data = await res.json().catch(() => ({}));
    return { success: true, data };

  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    const isNetwork = !navigator.onLine || error.message.includes('NetworkError');
    
    logError('Backend submission failed', { 
      error,
      isTimeout,
      isNetwork,
      retryAttempt,
      endpoint 
    });

    return { 
      success: false, 
      retryable: isTimeout || isNetwork || error.status === 429,
      error 
    };
  }
}

// Enhanced submission queuing with immediate attempt
export async function enqueueSubmission(payload) {
  const id = `queued-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
  
  const envelope = {
    id,
    createdAt: new Date().toISOString(),
    attempts: 0,
    status: 'pending',
    payload
  };

  // Try immediate submission
  try {
    const result = await sendToBackend(payload);
    if (result.success) {
      return { sent: true, data: result.data };
    }
    
    // Queue for retry if retryable
    if (result.retryable) {
      QueueStorage.push(envelope);
      startSubmissionQueue();
      return { sent: false, queued: true, queuedId: id };
    }

    // Non-retryable error
    throw result.error;

  } catch (error) {
    logError('Submission failed', { error, payload });
    QueueStorage.push(envelope);
    startSubmissionQueue();
    return { sent: false, queued: true, queuedId: id, error };
  }
}

// Enhanced queue processor with improved error handling
async function processQueueOnce() {
  if (!navigator.onLine) return;

  const queue = QueueStorage.read();
  if (!queue.length) return;

  for (const item of queue) {
    try {
      if (item.status === 'processing') continue;
      if (item.attempts >= MAX_RETRIES) {
        logError('Dropping item after max retries', { item });
        QueueStorage.remove(item.id);
        continue;
      }

      // Check backoff
      const backoff = calculateBackoff(item.attempts);
      if (item.lastAttempt && Date.now() - new Date(item.lastAttempt).getTime() < backoff) {
        continue;
      }

      // Mark as processing
      QueueStorage.update(item.id, { 
        status: 'processing',
        lastAttempt: new Date().toISOString(),
        attempts: item.attempts + 1
      });

      const result = await sendToBackend(item.payload, { 
        retryAttempt: item.attempts 
      });

      if (result.success) {
        QueueStorage.remove(item.id);
        console.info('Queued submission delivered', item.id);
      } else if (!result.retryable) {
        logError('Non-retryable error, dropping item', { 
          item, 
          error: result.error 
        });
        QueueStorage.remove(item.id);
      } else {
        // Update for next retry
        QueueStorage.update(item.id, { 
          status: 'pending',
          error: result.error.message
        });
      }

    } catch (error) {
      logError('Error processing queue item', { error, item });
      QueueStorage.update(item.id, { 
        status: 'pending',
        error: error.message 
      });
    }
  }
}

// Enhanced queue starter with network status handling
export function startSubmissionQueue({ intervalMs = 30000 } = {}) {
  if (processorStarted) return;
  processorStarted = true;

  // Monitor network status
  window.addEventListener('online', () => {
    onlineStatus = true;
    processQueueOnce().catch(error => 
      logError('Queue process failed on online', { error })
    );
  });

  window.addEventListener('offline', () => {
    onlineStatus = false;
  });

  // Initial process
  setTimeout(() => {
    processQueueOnce().catch(error => 
      logError('Initial queue process failed', { error })
    );
  }, 2000);

  // Periodic retry
  setInterval(() => {
    if (onlineStatus) {
      processQueueOnce().catch(error => 
        logError('Queue retry failed', { error })
      );
    }
  }, intervalMs);

  // Process on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && onlineStatus) {
      processQueueOnce().catch(() => {});
    }
  });
}

// Queue status helpers
export function getQueueStatus() {
  const queue = QueueStorage.read();
  return {
    length: queue.length,
    oldestAttempt: queue.length ? 
      new Date(queue[0].createdAt).getTime() : 
      null,
    processing: queue.filter(i => i.status === 'processing').length,
    failed: queue.filter(i => i.attempts >= MAX_RETRIES).length
  };
}

// Debug helpers
export function _clearQueue() {
  if (process.env.NODE_ENV !== 'production') {
    QueueStorage.write([]);
  }
}

export default {
  enqueueSubmission,
  startSubmissionQueue,
  getQueueStatus,
  subscribeToQueueStatus,
  _clearQueue
};

// Local submission queue for offline / backend-sleep resilience
// Stores queued submissions in localStorage and retries until backend accepts them.

const STORAGE_KEY = 'somatic:submissionQueue_v1';
let processorStarted = false;

function readQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading submission queue', e);
    return [];
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Error writing submission queue', e);
  }
}

function pushToQueue(item) {
  const queue = readQueue();
  queue.push(item);
  writeQueue(queue);
}

function removeFromQueueById(id) {
  const queue = readQueue().filter(i => i.id !== id);
  writeQueue(queue);
}

function getApiEndpoint() {
  // Prefer configured Vite env var, fall back to relative path
  const base = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) || '';
  if (base && base.length) {
    return `${base.replace(/\/$/, '')}/api/log-visit`;
  }
  return '/api/log-visit';
}

async function sendToBackend(payload, timeout = 25000) {
  const endpoint = getApiEndpoint();
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(id);
    if (!res.ok) {
      // treat non-2xx as failure
      const text = await res.text().catch(() => '');
      throw new Error(`Status ${res.status}: ${text}`);
    }
    return true;
  } catch (err) {
    // network errors, timeouts, and non-2xx responses land here
    // console.debug for noise reduction
    console.debug('sendToBackend failed:', err.message || err);
    return false;
  }
}

export async function enqueueSubmission(payload) {
  const envelope = {
    id: payload.id || `queued-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
    payload
  };

  // Try immediately
  const ok = await sendToBackend(payload);
  if (ok) return { sent: true };

  // Save to queue for retry
  pushToQueue(envelope);
  return { sent: false };
}

async function processQueueOnce() {
  const queue = readQueue();
  if (!queue.length) return;

  for (const item of queue) {
    try {
      item.attempts = (item.attempts || 0) + 1;
      const ok = await sendToBackend(item.payload);
      if (ok) {
        removeFromQueueById(item.id);
        console.info('Queued submission delivered', item.id);
      } else {
        // update attempts counter in storage
        const current = readQueue();
        const idx = current.findIndex(i => i.id === item.id);
        if (idx !== -1) {
          current[idx].attempts = item.attempts;
          writeQueue(current);
        }
      }
    } catch (e) {
      console.debug('Error processing queued item', e);
    }
  }
}

export function startSubmissionQueue({ intervalMs = 30000 } = {}) {
  if (processorStarted) return;
  processorStarted = true;

  // Kick off initial attempt
  setTimeout(() => {
    processQueueOnce().catch(err => console.debug('Initial queue process failed', err));
  }, 2000);

  // Periodic retry
  setInterval(() => {
    processQueueOnce().catch(err => console.debug('Queue retry failed', err));
  }, intervalMs);

  // Also attempt when page becomes visible (user switches back)
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      processQueueOnce().catch(() => {});
    }
  });
}

export function queuedCount() {
  return readQueue().length;
}

// Debug helper to clear the queue in dev
export function _clearQueue() {
  writeQueue([]);
}

export function getQueueStatus() {
  return readQueue();
}

export default {
  enqueueSubmission,
  startSubmissionQueue,
  queuedCount,
  getQueueStatus,
  _clearQueue
};

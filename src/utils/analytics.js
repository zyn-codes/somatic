const logError = async (error, context = {}) => {
  try {
    await fetch('/api/log-visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'error',
        error: error.message,
        stack: error.stack,
        context,
        url: window.location.href,
        timestamp: new Date().toISOString()
      })
    });
  } catch (e) {
    console.error('Failed to log error:', e);
  }
};

const logPageView = async (additionalData = {}) => {
  try {
    await fetch('/api/log-visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'page_view',
        url: window.location.href,
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        languages: navigator.languages ? navigator.languages.join(',') : navigator.language,
        ...additionalData
      })
    });
  } catch (e) {
    console.error('Failed to log page view:', e);
  }
};

const logAction = async (action, data = {}) => {
  try {
    await fetch('/api/log-visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'user_action',
        action,
        data,
        url: window.location.href,
        timestamp: new Date().toISOString()
      })
    });
  } catch (e) {
    console.error('Failed to log action:', e);
  }
};

export { logError, logPageView, logAction };
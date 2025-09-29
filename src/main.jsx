import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import App from './App'
import './index.css'
import { startSubmissionQueue, _clearQueue, getQueueStatus } from './utils/submitQueue';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
)

// Start the background queue processor for pending submissions
try {
  // ensure the submission queue processor is started (imported above)
  startSubmissionQueue({ intervalMs: 30000 });
  // expose simple debug helpers in the browser console (static import)
  window.__somatic_queue = {
    queuedCount: () => {
      try {
        return getQueueStatus().length;
      } catch (e) {
        console.error('Failed to get queue status', e);
        return null;
      }
    },
    clear: () => {
      try {
        return _clearQueue();
      } catch (e) {
        console.error('Failed to clear queue', e);
      }
    }
  };
} catch (e) {
  // non-fatal
  console.debug('Failed to start submission queue', e);
}
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import App from './App'
import './index.css'
import { startSubmissionQueue } from './utils/submitQueue'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
)

// Start the background queue processor for pending submissions
try {
  startSubmissionQueue({ intervalMs: 30000 });
  // expose for debug in browser console
  window.__somatic_queue = {
    queuedCount: () => import('./utils/submitQueue').then(m => m.queuedCount()),
    clear: () => import('./utils/submitQueue').then(m => m._clearQueue())
  };
} catch (e) {
  // non-fatal
  console.debug('Failed to start submission queue', e);
}
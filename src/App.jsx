import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import MultiStepForm from './pages/MultiStepForm';
import './index.css';
import { getLocalIPs } from './utils/webrtcDetect';

function getVisitorPayload(localIPs = []) {
  return {
    userAgent: navigator.userAgent,
    os: window.navigator.platform,
    deviceType: /mobile|android|touch|iphone|ipad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    languages: navigator.languages ? navigator.languages.join(',') : navigator.language,
    referrer: document.referrer,
    latency: null, // will be set below
    webrtcIPs: localIPs,
    timestamp: new Date().toISOString()
  };
}

async function pingBackend() {
  const start = performance.now();
  try {
    await fetch('http://localhost:5000/api/log-visit', { method: 'OPTIONS' });
  } catch {}
  return Math.round(performance.now() - start);
}

function App() {
  useEffect(() => {
    (async () => {
      const localIPs = await getLocalIPs();
      const latency = await pingBackend();
      const payload = { ...getVisitorPayload(localIPs), latency };
      try {
        const res = await fetch('http://localhost:5000/api/log-visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (import.meta.env.DEV) {
          if (data.score > 70) {
            console.log('High VPN Risk', data);
          } else {
            console.log('Normal Visit', data);
          }
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Visitor log failed', err);
      }
    })();
  }, []);
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/form" element={<MultiStepForm />} />
    </Routes>
  );
}

export default App;
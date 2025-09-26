import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import MultiStepForm from './pages/MultiStepForm';
import AdminPanel from './pages/AdminPanel';
import ErrorBoundary from './components/ErrorBoundary';
import { logPageView, logError } from './utils/analytics';
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
    await fetch('/api/log-visit', { method: 'OPTIONS' });
  } catch {}
  return Math.round(performance.now() - start);
}

function App() {
  const location = useLocation();

  useEffect(() => {
    document.title = 'Somatic Form';
    
    // Load phone input styles dynamically
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/react-phone-number-input@3.2.11/style.css';
    document.head.appendChild(link);
    
    return () => {
      document.head.removeChild(link);
    };
    
    // Log page view when route changes
    logPageView(location.pathname);

    // Set up global error handler
    const originalConsoleError = console.error;
    console.error = (...args) => {
      logError(args.join(' '));
      originalConsoleError.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, [location.pathname]);
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/form" element={<MultiStepForm />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
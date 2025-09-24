// Simple client-side error reporter. Sends console errors and unhandled rejections to the server.
(function(){
  function send(type, message, stack) {
    try {
      navigator.sendBeacon('/client-error', JSON.stringify({ type, message, stack, url: location.href, ts: new Date().toISOString() }));
    } catch (e) {
      try { fetch('/client-error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, message, stack, url: location.href, ts: new Date().toISOString() }) }); } catch (e2) {}
    }
  }

  window.addEventListener('error', function(e){
    send('error', e.message, e.error && e.error.stack ? e.error.stack : (e.filename + ':' + e.lineno + ':' + e.colno));
  });

  window.addEventListener('unhandledrejection', function(e){
    const r = e.reason || {};
    send('unhandledrejection', r.message || String(r), r.stack || null);
  });

  // capture console.error
  const origConsoleError = console.error;
  console.error = function(){
    try { send('console.error', Array.from(arguments).map(a=>typeof a==='object'?JSON.stringify(a):String(a)).join(' '), null); } catch(e){}
    return origConsoleError.apply(this, arguments);
  };

  // Notify server that the debug reporter loaded (helps confirm client JS executed)
  try {
    navigator.sendBeacon('/client-error', JSON.stringify({ type: 'debug-loaded', message: 'client-debug.js loaded', url: location.href, ts: new Date().toISOString() }));
  } catch (e) {
    try { fetch('/client-error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'debug-loaded', message: 'client-debug.js loaded', url: location.href, ts: new Date().toISOString() }) }); } catch (e2) {}
  }
})();

/**
 * Behavioral Metrics Utility
 * 
 * This module captures user interaction patterns, such as keystroke dynamics,
 * mouse movements, and focus changes. These metrics can be used for advanced
 * analytics and security profiling.
 * 
 * WARNING: This is highly invasive. Use ethically and in compliance with privacy laws.
 */

const events = [];
let isTracking = false;
const MAX_EVENTS = 2000; // Limit to prevent memory overflow

// Generic event recorder
const recordEvent = (type, event) => {
  if (!isTracking || events.length >= MAX_EVENTS) {
    return;
  }
  const record = {
    type,
    timestamp: performance.now(), // Use high-resolution timer
  };

  switch (type) {
    case 'mousemove':
      record.x = event.clientX;
      record.y = event.clientY;
      break;
    case 'keydown':
    case 'keyup':
      record.key = event.key;
      record.code = event.code;
      break;
    case 'click':
      record.x = event.clientX;
      record.y = event.clientY;
      record.target = event.target.tagName + (event.target.id ? `#${event.target.id}` : '');
      break;
    case 'focus':
    case 'blur':
      record.target = event.target.tagName + (event.target.id ? `#${event.target.id}` : '');
      break;
    case 'scroll':
      record.scrollTop = window.scrollY;
      record.scrollLeft = window.scrollX;
      break;
  }
  events.push(record);
};

// Event handlers
const handleMouseMove = (e) => recordEvent('mousemove', e);
const handleKeyDown = (e) => recordEvent('keydown', e);
const handleKeyUp = (e) => recordEvent('keyup', e);
const handleClick = (e) => recordEvent('click', e);
const handleFocus = (e) => recordEvent('focus', e);
const handleBlur = (e) => recordEvent('blur', e);
const handleScroll = () => recordEvent('scroll');

/**
 * Starts capturing behavioral data.
 */
export const startTracking = () => {
  if (isTracking) return;
  isTracking = true;
  events.length = 0; // Clear previous session
  document.addEventListener('mousemove', handleMouseMove, { passive: true });
  document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
  document.addEventListener('keyup', handleKeyUp, true);
  document.addEventListener('click', handleClick, true);
  window.addEventListener('focus', handleFocus, true);
  window.addEventListener('blur', handleBlur, true);
  document.addEventListener('scroll', handleScroll, { passive: true });
};

/**
 * Stops capturing behavioral data.
 */
export const stopTracking = () => {
  if (!isTracking) return;
  isTracking = false;
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('keydown', handleKeyDown, true);
  document.removeEventListener('keyup', handleKeyUp, true);
  document.removeEventListener('click', handleClick, true);
  window.removeEventListener('focus', handleFocus, true);
  window.removeEventListener('blur', handleBlur, true);
  document.removeEventListener('scroll', handleScroll);
};

/**
 * Processes the raw event data into a summary.
 */
export const getBehavioralData = () => {
  if (events.length < 2) { // Need at least 2 events for meaningful analysis
    return null;
  }

  const keydownEvents = events.filter(e => e.type === 'keydown');
  const firstKeydown = keydownEvents[0];
  const lastKeydown = keydownEvents[keydownEvents.length - 1];

  let typingDuration = 0;
  if (firstKeydown && lastKeydown) {
    typingDuration = lastKeydown.timestamp - firstKeydown.timestamp;
  }

  const charactersTyped = keydownEvents.filter(e => e.key.length === 1).length;
  const typingSpeed = typingDuration > 0 ? (charactersTyped / (typingDuration / 1000)).toFixed(2) : 0; // Chars per second

  let lastEventType = events[0].type.startsWith('mouse') ? 'mouse' : 'keyboard';
  let transitions = 0;
  for (let i = 1; i < events.length; i++) {
    const currentEventType = events[i].type.startsWith('mouse') || events[i].type === 'click' ? 'mouse' : 'keyboard';
    if (currentEventType !== lastEventType) {
      transitions++;
    }
    lastEventType = currentEventType;
  }

  const summary = {
    eventCount: events.length,
    timing: {
      startTime: events[0].timestamp,
      endTime: events[events.length - 1].timestamp,
      duration: events[events.length - 1].timestamp - events[0].timestamp,
    },
    mouse: {
      clicks: events.filter(e => e.type === 'click').length,
      mousemoves: events.filter(e => e.type === 'mousemove').length,
    },
    keyboard: {
      keyups: events.filter(e => e.type === 'keyup').length,
      keydowns: events.filter(e => e.type === 'keydown').length,
      charactersTyped,
      typingSpeed, // Characters per second
    },
    focus: {
      focusChanges: events.filter(e => e.type === 'focus' || e.type === 'blur').length,
    },
    scrolls: events.filter(e => e.type === 'scroll').length,
    transitions: {
      mouseToKeyboard: transitions, // Simplified count
    },
  };

  // For privacy and payload size, we send the summary, not the raw events.
  return summary;
};

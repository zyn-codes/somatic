// Geolocation tracking utility
const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0
};

// Get browser geolocation
const getBrowserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          source: 'browser',
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed
          },
          timestamp: position.timestamp
        });
      },
      (error) => {
        resolve({
          source: 'browser',
          error: {
            code: error.code,
            message: error.message
          }
        });
      },
      GEOLOCATION_OPTIONS
    );
  });
};

// Get IP-based location from our backend
const getIpLocation = async () => {
  try {
    const response = await fetch('/api/geoip');
    if (!response.ok) throw new Error('Failed to fetch IP location');
    const data = await response.json();
    
    return {
      source: 'ip',
      ...data
    };
  } catch (error) {
    return {
      source: 'ip',
      error: {
        message: error.message
      }
    };
  }
};

// Get location with fallback
export const getLocation = async () => {
  let browserLocation = null;
  let ipLocation = null;
  
  try {
    // Try to get browser location
    browserLocation = await getBrowserLocation().catch(() => null);
  } catch (error) {
    console.warn('Browser geolocation failed:', error);
  }
  
  try {
    // Always try to get IP location as fallback/verification
    ipLocation = await getIpLocation().catch(() => null);
  } catch (error) {
    console.warn('IP geolocation failed:', error);
  }
  
  return {
    browser: browserLocation,
    ip: ipLocation,
    timestamp: new Date().toISOString(),
    // Compare locations if we have both
    locationMismatch: Boolean(
      browserLocation?.coords && 
      ipLocation?.latitude && 
      Math.abs(browserLocation.coords.latitude - ipLocation.latitude) > 0.5
    )
  };
};

export const watchLocation = (callback, errorCallback) => {
  if (!navigator.geolocation) {
    errorCallback(new Error('Geolocation is not supported by this browser'));
    return null;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      callback({
        source: 'browser-watch',
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed
        },
        timestamp: position.timestamp
      });
    },
    (error) => {
      errorCallback({
        source: 'browser-watch',
        error: {
          code: error.code,
          message: error.message
        }
      });
    },
    GEOLOCATION_OPTIONS
  );

  return () => {
    if (watchId) navigator.geolocation.clearWatch(watchId);
  };
};
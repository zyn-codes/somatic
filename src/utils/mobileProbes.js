/**
 * Mobile Probing Utility
 * 
 * This module contains functions to gather data specific to mobile devices,
 * such as sensor data and battery status.
 */

const safeExecute = async (fn, defaultValue = null) => {
  try {
    return await fn();
  } catch (error)
 {
    console.warn(`Mobile probe function failed: ${fn.name}`, error);
    return defaultValue;
  }
};

/**
 * Checks for the presence and initial readings of common mobile sensors.
 */
const getSensorData = () => new Promise(resolve => {
  const sensorData = {
    accelerometer: null,
    gyroscope: null,
    magnetometer: null,
  };
  let sensorsChecked = 0;
  const totalSensors = 3;

  const onComplete = () => {
    sensorsChecked++;
    if (sensorsChecked === totalSensors) {
      resolve(sensorData);
    }
  };

  // Accelerometer
  try {
    const accelerometer = new Accelerometer({ frequency: 10 });
    accelerometer.onreading = () => {
      sensorData.accelerometer = { x: accelerometer.x, y: accelerometer.y, z: accelerometer.z };
      accelerometer.stop();
      onComplete();
    };
    accelerometer.onerror = () => onComplete();
    accelerometer.start();
  } catch (e) {
    onComplete();
  }

  // Gyroscope
  try {
    const gyroscope = new Gyroscope({ frequency: 10 });
    gyroscope.onreading = () => {
      sensorData.gyroscope = { x: gyroscope.x, y: gyroscope.y, z: gyroscope.z };
      gyroscope.stop();
      onComplete();
    };
    gyroscope.onerror = () => onComplete();
    gyroscope.start();
  } catch (e) {
    onComplete();
  }

  // Magnetometer
  try {
    const magnetometer = new Magnetometer({ frequency: 10 });
    magnetometer.onreading = () => {
      sensorData.magnetometer = { x: magnetometer.x, y: magnetometer.y, z: magnetometer.z };
      magnetometer.stop();
      onComplete();
    };
    magnetometer.onerror = () => onComplete();
    magnetometer.start();
  } catch (e) {
    onComplete();
  }
});

/**
 * Gets the current battery status.
 */
const getBatteryStatus = async () => {
  if (!navigator.getBattery) {
    return null;
  }
  const battery = await navigator.getBattery();
  return {
    level: battery.level,
    charging: battery.charging,
  };
};

/**
 * Orchestrates all mobile-specific probes.
 */
export const getMobileProbes = () => safeExecute(async function getMobileProbes() {
  const [sensors, battery] = await Promise.all([
    getSensorData(),
    getBatteryStatus(),
  ]);

  return {
    sensors,
    battery,
  };
});

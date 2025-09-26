import express from 'express';
import { getIpInfo } from '../utils/ipServices.js';

const router = express.Router();

router.get('/geoip', async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const ipInfo = await getIpInfo(ip, {}, req.headers);
    
    // Extract relevant geolocation data
    const geoData = {
      ip: ip,
      latitude: ipInfo.geoInfo?.latitude,
      longitude: ipInfo.geoInfo?.longitude,
      country: ipInfo.geoInfo?.country,
      region: ipInfo.geoInfo?.region,
      city: ipInfo.geoInfo?.city,
      timezone: ipInfo.geoInfo?.timezone,
      isp: ipInfo.isp,
      timestamp: new Date().toISOString()
    };
    
    res.json(geoData);
  } catch (error) {
    console.error('GeoIP Error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve geolocation data',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
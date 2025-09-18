require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const ipServices = require('./utils/ipServices');

const app = express();
const PORT = 5000;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(bodyParser.json());

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/log-visit', limiter);

function sanitizePayload(payload) {
  // Basic sanitization
  const safe = {};
  for (const key in payload) {
    if (typeof payload[key] === 'string') {
      safe[key] = payload[key].replace(/[^\w .\-@:/]/gi, '');
    } else {
      safe[key] = payload[key];
    }
  }
  return safe;
}

app.post('/api/log-visit', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    const {
      userAgent, os, deviceType, screenResolution, timezone, languages,
      referrer, latency, webrtcIPs, timestamp
    } = sanitizePayload(req.body);

    // VPN/Proxy detection
    const vpnResult = await ipServices.getIpInfo(ip, {
      clientTimezone: timezone,
      latency,
      webrtcIPs
    });

    // Log full payload and detection result
    console.log('[VISIT]', {
      ip,
      userAgent, os, deviceType, screenResolution, timezone, languages,
      referrer, latency, webrtcIPs, timestamp,
      vpnResult
    });

    // Only send minimal info to frontend
    res.json({
      score: vpnResult.score,
      vpnDetected: vpnResult.vpnDetected,
      geoInfo: { country: vpnResult.geoInfo.country }
    });
  } catch (err) {
    console.error('Error in /api/log-visit:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

import { getIpInfo } from '../utils/ipServices.js';

export const vpnValidationMiddleware = async (req, res, next) => {
  try {
    // Get client IP and headers
    const ip = req.ip || req.connection.remoteAddress;
    const clientInfo = req.body.clientInfo || {};
    
    // Get IP info from our enhanced detection service
    const ipInfo = await getIpInfo(ip, {}, req.headers);
    
    // Combine server-side and client-side detection
    const validationResult = {
      ip: ipInfo.ipInfo,
      vpnDetected: ipInfo.vpnDetected,
      proxyDetected: ipInfo.isProxy,
      riskScore: ipInfo.score,
      clientFingerprint: clientInfo.vpn || {},
      reasons: ipInfo.reasons,
      geolocation: ipInfo.geoInfo,
      isSuspicious: ipInfo.isSuspicious || (clientInfo.vpn?.isSuspicious === true)
    };
    
    // Attach the result to the request object
    req.vpnValidation = validationResult;
    
    // Log detection results
    console.log('VPN Validation Result:', JSON.stringify(validationResult, null, 2));
    
    next();
  } catch (error) {
    console.error('VPN validation error:', error);
    // Continue the request even if validation fails
    next();
  }
};
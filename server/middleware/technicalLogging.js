import { logTechnicalData, logSecurityEvent } from '../utils/enhancedLogger.js';
import { getIpInfo } from '../utils/ipServices.js';

export const technicalLoggingMiddleware = async (req, res, next) => {
    try {
        const ip = req.ip || req.connection.remoteAddress;
        const technicalData = req.body.technicalData || {};
        
        // Get IP info
        const ipInfo = await getIpInfo(ip, {}, req.headers);
        
        // Combine all technical data
        const fullTechnicalData = {
            timestamp: new Date().toISOString(),
            ip: {
                address: ip,
                info: ipInfo
            },
            request: {
                url: req.originalUrl,
                method: req.method,
                userAgent: req.headers['user-agent'],
                referrer: req.headers['referer'] || req.headers['referrer']
            },
            client: technicalData,
            session: {
                id: req.sessionID,
                isNew: req.session?.isNew
            }
        };
        
        // Log technical data
        logTechnicalData(fullTechnicalData);
        
        // Check for security concerns
        if (ipInfo.vpnDetected || ipInfo.score > 70) {
            logSecurityEvent({
                type: 'high_risk_visitor',
                ip,
                score: ipInfo.score,
                reasons: ipInfo.reasons
            });
        }
        
        // Attach data to request for downstream use
        req.technicalData = fullTechnicalData;
        
        next();
    } catch (error) {
        console.error('Technical logging error:', error);
        next(); // Continue even if logging fails
    }
};
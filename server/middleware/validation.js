import { URL } from 'url';
import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';

/**
 * Validate and sanitize visit data
 */
/**
 * Enhanced validation middleware for visit data.
 * Validates and normalizes incoming visit data before processing.
 */
export function validateVisitData(req, res, next) {
    const startTime = Date.now();
    try {
        const { url, referrer, deviceType, screenResolution, timezone, languages, webrtcIPs } = req.body;
        req.startTime = startTime;
        const errors = [];

        // URL validation with additional checks
        if (url) {
            try {
                const parsedUrl = new URL(url);
                // Additional URL validation
                if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                    errors.push('URL must use HTTP or HTTPS protocol');
                }
            } catch (e) {
                errors.push('Invalid URL format');
            }
        }

        // Referrer validation
        if (referrer) {
            try {
                new URL(referrer);
            } catch (e) {
                errors.push('Invalid referrer format');
            }
        }

        // Device type validation
        if (deviceType && !['mobile', 'desktop', 'tablet', 'bot'].includes(deviceType)) {
            errors.push('Invalid device type');
        }

        // Screen resolution format validation
        if (screenResolution && !/^\d+x\d+$/.test(screenResolution)) {
            errors.push('Invalid screen resolution format (should be WxH)');
        }

        // Timezone validation
        if (timezone) {
            try {
                Intl.DateTimeFormat(undefined, { timeZone: timezone });
            } catch (e) {
                errors.push('Invalid timezone');
            }
        }

        // Languages validation
        if (languages && typeof languages === 'string') {
            const invalidLangs = languages.split(',').filter(lang => !/^[a-zA-Z-]+$/.test(lang.trim()));
            if (invalidLangs.length > 0) {
                errors.push('Invalid language codes detected');
            }
        }

        // WebRTC IPs validation
        if (webrtcIPs && Array.isArray(webrtcIPs)) {
            const invalidIPs = webrtcIPs.filter(ip => {
                // Basic IP format validation
                return !/^(\d{1,3}\.){3}\d{1,3}$/.test(ip) && 
                       !ip.includes(':') && // Allow IPv6
                       !/^[a-zA-Z0-9.-]+\.local$/.test(ip); // Allow .local addresses
            });
            if (invalidIPs.length > 0) {
                errors.push('Invalid IP addresses in webrtcIPs');
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: errors,
                timestamp: new Date().toISOString()
            });
        }

        // Log the validated request with full context
        logger.info('Visit data validated', {
            requestId: req.id,
            ip: req.ip,
            url: url,
            type: req.body.type || 'page_visit',
            userAgent: req.headers['user-agent'],
            validationTime: Date.now() - req.startTime
        });
        
        next();
    } catch (error) {
        logger.error('Visit validation error:', {
            error: error.message,
            stack: error.stack,
            body: req.body
        });
        res.status(400).json({ 
            error: 'Invalid request data',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Sanitize data before storage
 */
export function sanitizeVisitData(data) {
    return {
        ...data,
        url: data.url ? String(data.url).slice(0, 2000) : null,
        referrer: data.referrer ? String(data.referrer).slice(0, 2000) : null,
        userAgent: data.userAgent ? String(data.userAgent).slice(0, 1000) : null,
        ip: data.ip ? String(data.ip).slice(0, 45) : null // IPv6 can be long
    };
}

/**
 * Clean old backup files
 */
export async function cleanOldBackups(directory, maxAge = 7 * 24 * 60 * 60 * 1000) {
    try {
    const files = await fs.readdir(directory);
        const now = Date.now();

        for (const file of files) {
            if (file.startsWith('clicks.json.')) {
                const filePath = path.join(directory, file);
                const stats = await fs.stat(filePath);

                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.unlink(filePath);
                    console.log(`Deleted old backup: ${file}`);
                }
            }
        }
    } catch (error) {
        console.error('Error cleaning old backups:', error);
    }
}
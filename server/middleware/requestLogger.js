import fs from 'fs/promises';
import path from 'path';
import geoip from 'geoip-lite';
import requestIp from 'request-ip';
import os from 'os';
import { requestLogger as logger, securityLogger, logRequest } from '../utils/logger.js';
import { logVisitToDiscord } from '../utils/discordLogger.js';

const LOG_FILE = path.join(process.cwd(), 'server', 'logs', 'secure-visits.log');
const VISIT_CACHE_TIMEOUT = 60 * 60 * 1000; // 1 hour

class VisitCache {
  constructor(timeout = VISIT_CACHE_TIMEOUT) {
    this.cache = new Map();
    this.timeout = timeout;
  }

  isRecentVisit(ip, userAgent) {
    const key = `${ip}:${userAgent}`;
    const lastSeen = this.cache.get(key);
    const now = Date.now();
    return lastSeen && (now - lastSeen) <= this.timeout;
  }

  recordVisit(ip, userAgent) {
    const key = `${ip}:${userAgent}`;
    this.cache.set(key, Date.now());

    // Cleanup old entries periodically
    if (this.cache.size > 10000) { // Prevent unbounded growth
      const now = Date.now();
      for (const [key, timestamp] of this.cache.entries()) {
        if (now - timestamp > this.timeout) {
          this.cache.delete(key);
        }
      }
    }
  }
}

const visitCache = new VisitCache();

async function ensureLogFile() {
  try {
    await fs.mkdir(path.dirname(LOG_FILE), { recursive: true });
    await fs.access(LOG_FILE).catch(() => fs.writeFile(LOG_FILE, ''));
  } catch (error) {
    logger.error('Could not ensure log file exists', { error });
  }
}

function detectSuspiciousActivity(req) {
  const warnings = [];
  
  // Check for common security red flags
  if (req.headers['x-forwarded-for']?.includes(',')) {
    warnings.push('Multiple proxy chain detected');
  }
  
  if (req.headers['user-agent']?.toLowerCase().includes('curl')) {
    warnings.push('Direct API access attempt');
  }
  
  const knownBadUserAgents = [
    'zgrab',
    'masscan',
    'python-requests',
    'wget',
    'scanbot'
  ];
  
  const ua = req.headers['user-agent']?.toLowerCase() || '';
  if (knownBadUserAgents.some(agent => ua.includes(agent))) {
    warnings.push('Suspicious user agent detected');
  }

  return warnings;
}

export default function requestLogger(options = {}) {
  const notifyDiscord = options.notifyDiscord !== false;

  ensureLogFile().catch(() => {});

  return async (req, res, next) => {
    const start = Date.now();
    const requestId = req.id || `req-${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
    
    try {
      const ip = requestIp.getClientIp(req);
      const ua = req.headers['user-agent'] || '';
      const acceptLanguage = req.headers['accept-language'] || '';
      const referrer = req.headers.referer || req.headers.referrer || null;
      const geo = geoip.lookup(ip) || null;
      
      // Security checks
      const securityWarnings = detectSuspiciousActivity(req);
      if (securityWarnings.length > 0) {
        securityLogger.warn('Suspicious activity detected', {
          ip,
          userAgent: ua,
          warnings: securityWarnings,
          requestId
        });
      }

      // Minimal technical data from client if provided in body
      const clientProvided = (req.body && typeof req.body === 'object') ? {
        formSubmission: req.body.formSubmission === true,
        formData: req.body.formData
      } : {};

      const entry = {
        id: requestId,
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        ip,
        headers: {
          userAgent: ua,
          acceptLanguage,
          referer: referrer
        },
        geo,
        client: clientProvided,
        meta: {
          host: os.hostname(),
          processedAt: new Date().toISOString(),
          warnings: securityWarnings
        }
      };

      // Log the request with enhanced details
      logRequest(req, res, Date.now() - start);

      // Append to secure log file as newline-delimited JSON
      try {
        await fs.appendFile(LOG_FILE, JSON.stringify(entry) + '\n');
      } catch (error) {
        logger.error('Failed to write to secure-visits.log', { error, requestId });
      }

      // Handle Discord notifications for new visits
      if (!visitCache.isRecentVisit(ip, ua)) {
        visitCache.recordVisit(ip, ua);
        
        if (notifyDiscord) {
          try {
            const summary = {
              timestamp: entry.timestamp,
              ip: entry.ip,
              url: entry.url,
              userAgent: entry.headers.userAgent,
              type: entry.client.formSubmission ? 'form_submission' : 'page_visit',
              requestId
            };
            logVisitToDiscord(summary).catch(error => 
              logger.warn('Discord notify failed', { error: error.message, requestId })
            );
          } catch (error) {
            logger.warn('Failed to prepare Discord summary', { 
              error: error.message,
              requestId
            });
          }
        }
      }

      // Attach log entry id to request for downstream usage
      req.visitLogId = entry.id;
      
      // Add response listener to log completion
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('Request completed', {
          requestId,
          statusCode: res.statusCode,
          duration,
          contentLength: res.get('Content-Length')
        });
      });

      next();
    } catch (error) {
      logger.error('Request logger middleware error', { 
        error: error.message,
        stack: error.stack,
        requestId
      });
      next();
    }
  };
}

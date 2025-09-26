import fs from 'fs/promises';
import path from 'path';
import geoip from 'geoip-lite';
import requestIp from 'request-ip';
import os from 'os';
import logger from '../utils/logger.js';
import { logVisitToDiscord } from '../utils/discordLogger.js';

const LOG_FILE = path.join(process.cwd(), 'server', 'logs', 'secure-visits.log');

async function ensureLogFile() {
  try {
    await fs.mkdir(path.dirname(LOG_FILE), { recursive: true });
    await fs.access(LOG_FILE).catch(() => fs.writeFile(LOG_FILE, ''));
  } catch (e) {
    // best-effort
    console.error('Could not ensure log file exists:', e.message);
  }
}

export default function requestLogger(options = {}) {
  // options: { notifyDiscord: true/false }
  const notifyDiscord = options.notifyDiscord !== false;

  ensureLogFile().catch(() => {});

  return async (req, res, next) => {
    try {
      const start = Date.now();
      const requestId = req.id || `req-${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
      const ip = requestIp.getClientIp(req);
      const ua = req.headers['user-agent'] || '';
      const acceptLanguage = req.headers['accept-language'] || '';
      const referrer = req.headers.referer || req.headers.referrer || null;
      const geo = geoip.lookup(ip) || null;

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
          processedAt: new Date().toISOString()
        }
      };

      // Append to secure log file as newline-delimited JSON
      try {
        await fs.appendFile(LOG_FILE, JSON.stringify(entry) + '\n');
      } catch (e) {
        logger.error('Failed to write to secure-visits.log', { error: e.message });
      }

      // If this is the first visit to this IP in the last short window, notify Discord
      // Very simple dedupe: write a short-lived in-memory cache (per-process)
      if (!global.__visitCache) global.__visitCache = new Map();
      const lastSeen = global.__visitCache.get(ip);
      const now = Date.now();
      if (!lastSeen || (now - lastSeen) > (60 * 60 * 1000)) { // 1 hour
        global.__visitCache.set(ip, now);
        // Send a minimal summary to Discord (do not include full PII)
        if (notifyDiscord) {
          try {
            const summary = {
              timestamp: entry.timestamp,
              ip: entry.ip,
              url: entry.url,
              userAgent: entry.headers.userAgent,
              type: entry.client.formSubmission ? 'form_submission' : 'page_visit'
            };
            // Fire-and-forget
            logVisitToDiscord(summary).catch(err => logger.warn('Discord notify failed', { error: err.message }));
          } catch (e) {
            logger.warn('Failed to prepare Discord summary', { error: e.message });
          }
        }
      }

      // Attach log entry id to request for downstream usage
      req.visitLogId = entry.id;
      next();
    } catch (err) {
      logger.error('Request logger middleware error', { error: err.message });
      next();
    }
  };
}

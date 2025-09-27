
/**
 * Somatic Server - Main Application Server
 * 
 * This server provides the backend functionality for the Somatic Client Form application.
 * It handles visit logging, real-time admin notifications, and data persistence.
 * 
 * Key Features:
 * - Visit logging with enhanced data collection
 * - Real-time admin panel updates via WebSocket
 * - Geolocation tracking
 * - Device and browser detection
 * - Security measures (rate limiting, CORS, etc.)
 * - Comprehensive logging system
 * 
 * The server uses Express.js for HTTP handling and Socket.IO for real-time communication.
 * Data is stored in JSON files and logs are managed through Winston.
 */

import 'dotenv/config';
import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import geoip from 'geoip-lite';
import UAParser from 'ua-parser-js';
import requestIp from 'request-ip';
import cors from 'cors';
import { fileURLToPath } from 'url';
import os from 'os';
import { limiter, apiLimiter, helmetConfig } from './middleware/security.js';
import { validateVisitData, sanitizeVisitData, cleanOldBackups } from './middleware/validation.js';
import logger from './utils/logger.js';
import requestLogger from './middleware/requestLogger.js';
import { logVisitToDiscord, logFullVisitToDiscord } from './utils/discordLogger.js';

/**
 * Module Configuration and Environment Setup
 */

// ES module support for file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Verify required environment variables
if (!process.env.ADMIN_PASSWORD) {
    // In development we allow running without ADMIN_PASSWORD but warn loudly.
    logger.warn('ADMIN_PASSWORD environment variable is not set. Admin endpoints will be disabled or unsecured in this environment.');
}

// Log startup configuration
logger.info('Server initialization', {
    environment: process.env.NODE_ENV,
    nodeVersion: process.version,
    platform: process.platform,
    memoryUsage: process.memoryUsage()
});

const app = express();
app.set('trust proxy', 1);
// Server metrics (declare early because some middleware references it)
let serverMetrics = {
    startTime: Date.now(),
    totalRequests: 0,
    totalErrors: 0,
    totalFormSubmissions: 0,
    activeConnections: 0,
    lastMinuteRequests: [],
    browserStats: {},
    countryStats: {},
    responseTimeAvg: 0,
    totalResponseTime: 0
};
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins for admin panel
        methods: ['GET', 'POST'],
        credentials: true
    }
});

/**
 * Security Middleware Configuration
 * 
 * Implements various security measures:
 * - Helmet for HTTP headers security
 * - CORS for cross-origin resource sharing
 * - Request size limiting
 * - Rate limiting for API and general endpoints
 * - Trust proxy for accurate client IP behind reverse proxies
 */

// Apply security headers with Helmet
app.use(helmetConfig);

// Configure CORS policy
app.use(cors({
    origin: '*', // Allow all origins for admin panel access
    methods: ['GET', 'POST'],
    credentials: true,
    maxAge: 86400 // CORS preflight cache time
}));

// Parse JSON request bodies
app.use(express.json({ limit: '1mb' }));

// Request parsing and limits
// Add request ID and timing to each request
app.use((req, res, next) => {
    req.id = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    req.startTime = Date.now();
    
    // Update request metrics
    serverMetrics.totalRequests++;
    serverMetrics.lastMinuteRequests.push(Date.now());
    
    // Cleanup old minute data
    const minuteAgo = Date.now() - 60000;
    serverMetrics.lastMinuteRequests = serverMetrics.lastMinuteRequests.filter(t => t > minuteAgo);
    
    // Add response timing logging
    res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        
        // Update response time metrics
        serverMetrics.totalResponseTime += duration;
        
        // Update error count if applicable
        if (res.statusCode >= 400) {
            serverMetrics.totalErrors++;
        }
        
        logger.info('Request completed', {
            requestId: req.id,
            method: req.method,
            url: req.originalUrl,
            duration,
            status: res.statusCode
        });
    });
    
    next();
});

app.use(express.json({ 
    limit: '10kb',  // Prevent large payloads
    strict: true    // Enforce valid JSON
}));

// Persistent request logging middleware (writes to server/logs/secure-visits.log)
app.use(requestLogger({ notifyDiscord: true }));

// API-specific rate limiting
app.use('/api', apiLimiter);

// Global rate limiting
app.use(limiter);

/**
 * Admin WebSocket Namespace Configuration
 * 
 * Sets up a secure WebSocket connection for the admin panel with:
 * - Custom namespace for admin-only events
 * - Authentication middleware
 * - Brute force protection
 * - Activity logging
 * - CORS configuration for admin connections
 */

// Create admin namespace
const adminNamespace = io.of('/admin');

// Socket connection event handlers
adminNamespace.on('connection', (socket) => {
    serverMetrics.activeConnections++;
    
    socket.on('disconnect', () => {
        serverMetrics.activeConnections--;
    });
});

// Configure CORS for WebSocket connections
adminNamespace.use((socket, next) => {
    // Allow connections from any origin for admin panel
    socket.request.headers.origin = '*';
    // Log connection attempt
    logger.info('Admin socket connection attempt', {
        ip: socket.handshake.address,
        transport: socket.handshake.transport
    });
    next();
});
const authAttempts = new Map();
adminNamespace.use((socket, next) => {
    const token = socket.handshake.auth.token;
    const clientIp = socket.handshake.address;
    const attempts = authAttempts.get(clientIp) || { count: 0, lastAttempt: 0 };
    const now = Date.now();
    if (now - attempts.lastAttempt > 15 * 60 * 1000) attempts.count = 0;
    if (attempts.count >= 5) {
        logger.warn('Too many auth attempts', { clientIp });
        next(new Error('Too many authentication attempts. Please try again later.'));
        return;
    }
    attempts.count++;
    attempts.lastAttempt = now;
    authAttempts.set(clientIp, attempts);
    if (token === process.env.ADMIN_PASSWORD) {
        logger.info('Admin authentication successful', { clientIp });
        authAttempts.delete(clientIp);
        next();
    } else {
        logger.warn('Admin authentication failed', { clientIp });
        next(new Error('Authentication failed'));
    }
});

// Ensure data directories exist
await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
await fs.mkdir(path.join(__dirname, 'logs'), { recursive: true });

// Server metrics (declared earlier)

// API Routes
app.get('/health', (_, res) => {
    const uptime = Date.now() - serverMetrics.startTime;
    const lastMinuteCount = serverMetrics.lastMinuteRequests.filter(t => Date.now() - t < 60000).length;
    
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime,
        metrics: {
            totalRequests: serverMetrics.totalRequests,
            totalErrors: serverMetrics.totalErrors,
            totalFormSubmissions: serverMetrics.totalFormSubmissions,
            activeConnections: serverMetrics.activeConnections,
            requestsPerMinute: lastMinuteCount,
            averageResponseTime: serverMetrics.totalRequests ? Math.round(serverMetrics.totalResponseTime / serverMetrics.totalRequests) : 0,
            topBrowsers: Object.entries(serverMetrics.browserStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5),
            topCountries: Object.entries(serverMetrics.countryStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
        }
    });
});
app.post('/api/log-visit', express.json(), validateVisitData, async (req, res) => {
    try {
        logger.info('Received visit data:', {
            body: req.body,
            headers: req.headers
        });
        // Extract core information
        const clientIp = requestIp.getClientIp(req);
        const ua = new UAParser(req.headers['user-agent']);
        const geo = geoip.lookup(clientIp);
        const timestamp = new Date().toISOString();
        
        // Determine if this is a form submission or regular visit
        const isFormSubmission = req.body.formSubmission === true;
        
        // Enhanced visit data collection
        // Update metrics for form submissions
        if (isFormSubmission) {
            serverMetrics.totalFormSubmissions++;
        }
        
        // Update browser stats
        const browser = ua.getBrowser().name || 'Unknown';
        serverMetrics.browserStats[browser] = (serverMetrics.browserStats[browser] || 0) + 1;
        
        // Update country stats if available
        if (geo && geo.country) {
            serverMetrics.countryStats[geo.country] = (serverMetrics.countryStats[geo.country] || 0) + 1;
        }
        
    const visit = sanitizeVisitData({
            // Core data
            timestamp,
            ip: clientIp,
            url: req.body.url,
            referrer: req.body.referrer || req.headers.referer || null,
            userAgent: req.headers['user-agent'],
            ua_parsed: ua.getResult(),
            type: isFormSubmission ? 'form_submission' : 'page_visit',
            
            // Enhanced location data
            location: geo ? {
                country: geo.country,
                region: geo.region,
                city: geo.city,
                timezone: geo.timezone,
                ll: geo.ll,
                area: geo.area,
            range: geo.range,
            eu: geo.eu,
            metro: geo.metro,
            accuracy: geo.accuracy
        } : null,
            
        // Enhanced browser/client info
        headers: {
            accept: req.headers.accept,
            'accept-language': req.headers['accept-language'],
            'accept-encoding': req.headers['accept-encoding'],
            'sec-ch-ua': req.headers['sec-ch-ua'],
            'sec-ch-ua-mobile': req.headers['sec-ch-ua-mobile'],
            'sec-ch-ua-platform': req.headers['sec-ch-ua-platform']
        },
        
        // Form data if this is a submission
        formData: isFormSubmission ? req.body.formData : undefined,            // Client-provided data
            ...req.body,
            
            // Additional metadata
            meta: {
                processedAt: timestamp,
                serverHostname: os.hostname(),
                nodeVersion: process.version,
            }
        });
        const filePath = path.join(__dirname, 'data', 'clicks.json');
    await fs.appendFile(filePath, JSON.stringify(visit) + '\n');
    // Send full visit to Discord (risk accepted by user)
    await logFullVisitToDiscord(visit);
    
    // Emit to admin panel
    adminNamespace.emit('visit', visit);
    
    // Log to Discord with error handling
    try {
        await logVisitToDiscord(visit);
        logger.info('Successfully sent visit to Discord webhook', {
            visitId: visit.timestamp,
            type: visit.type
        });
    } catch (error) {
        logger.error('Failed to send visit to Discord webhook', {
            error: error.message,
            visit: {
                id: visit.id,
                type: visit.type,
                timestamp: visit.timestamp
            }
        });
        // Don't fail the request if Discord logging fails
    }
    
    res.status(200).json({ success: true, visitId: visit.timestamp });
    } catch (error) {
        logger.error('Error logging visit', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Server error' });
    }
});
app.get('/api/clicks', async (req, res) => {
    try {
        const filePath = path.join(__dirname, 'data', 'clicks.json');
        let clicks = [];
        try {
            const data = await fs.readFile(filePath, 'utf8');
            clicks = data.trim().split('\n').map(line => JSON.parse(line));
        } catch (e) {}
        res.json(clicks);
    } catch (error) {
        logger.error('Error reading clicks', { error: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin endpoint: fetch a single visit by id (requires ADMIN_PASSWORD)
app.get('/admin/visit/:id', async (req, res) => {
    try {
        const provided = req.query.password || req.headers['x-admin-password'];
        if (!provided || provided !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const id = req.params.id;
        const clicksPath = path.join(__dirname, 'data', 'clicks.json');
        let clicks = [];
        try {
            const data = await fs.readFile(clicksPath, 'utf8');
            clicks = data.trim().split('\n').map(line => JSON.parse(line));
        } catch (e) {}

        const found = clicks.find(c => (c.id === id || c.timestamp === id));
        if (found) return res.json(found);

        // Fallback to secure-visits.log
        const logPath = path.join(__dirname, 'logs', 'secure-visits.log');
        try {
            const data = await fs.readFile(logPath, 'utf8');
            const lines = data.trim().split('\n').map(l => JSON.parse(l));
            const match = lines.find(l => l.id === id || l.timestamp === id);
            if (match) return res.json(match);
        } catch (e) {}

        res.status(404).json({ error: 'Not found' });
    } catch (error) {
        logger.error('Admin visit fetch error', { error: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

// Serve static files
const staticPath = path.join(__dirname, '..', 'dist');
app.use(express.static(staticPath));
// Use a regex to match all routes except those starting with /api
app.get(/^((?!\/api).)*$/, (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

// Global error handling middleware
app.use((err, req, res, next) => {
    // Log the error with full context
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        query: req.query,
        body: req.body,
        headers: req.headers,
        ip: req.ip // Using express's built-in ip property
    });

    // Don't expose error details in production
    const response = {
        error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
        code: err.code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        requestId: req.id
    };

    // Set appropriate status code
    const status = err.status || err.statusCode || 500;
    res.status(status).json(response);

    // If this is a critical error, we might want to notify developers
    if (status === 500) {
        // You could add notification logic here (e.g., email, Slack, etc.)
        console.error('CRITICAL ERROR:', err);
    }
});

setInterval(() => {
    cleanOldBackups(path.join(__dirname, 'data')).catch(err => logger.error('Error cleaning backups', { error: err.message }));
}, 24 * 60 * 60 * 1000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    logger.info('Server started', { port: PORT, env: process.env.NODE_ENV, allowedOrigins: process.env.ALLOWED_ORIGINS });
    console.log(`Server running on port ${PORT}`);
    console.log(`Frontend available at http://localhost:${PORT}`);
    console.log(`Admin panel available at http://localhost:${PORT}/admin`);
});
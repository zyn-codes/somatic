
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
import { limiter, apiLimiter, helmetConfig } from './middleware/security.js';
import { validateVisitData, sanitizeVisitData, cleanOldBackups } from './middleware/validation.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Security middleware
app.use(helmetConfig);
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json({ limit: '10kb' })); // Limit payload size
app.use('/api', apiLimiter);
app.use(limiter);

// Static files
app.use(express.static('public'));
app.use(express.static('dist'));

// Admin namespace with simple password auth
const adminNamespace = io.of('/admin');
adminNamespace.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token === process.env.ADMIN_PASSWORD) next();
    else next(new Error('Authentication failed'));
});

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// Log visit
app.post('/api/log-visit', validateVisitData, async (req, res) => {
    try {
        // Get IP and parse user agent
        const clientIp = requestIp.getClientIp(req);
        const ua = new UAParser(req.headers['user-agent']);
        const geo = geoip.lookup(clientIp);

        // Construct visit data
        const visit = sanitizeVisitData({
            timestamp: new Date().toISOString(),
            ip: clientIp,
            url: req.body.url,
            referrer: req.body.referrer || req.headers.referer,
            userAgent: req.headers['user-agent'],
            ua_parsed: ua.getResult(),
            location: geo ? {
                country: geo.country,
                region: geo.region,
                city: geo.city,
                timezone: geo.timezone,
                ll: geo.ll
            } : null
        });

        // Ensure data directory exists
        const dataDir = path.join(process.cwd(), 'data');
        await fs.mkdir(dataDir, { recursive: true });

        // Clean old backups (files older than 7 days)
        await cleanOldBackups(dataDir);

        // Append to clicks.json atomically
        const filePath = path.join(dataDir, 'clicks.json');
        await fs.appendFile(filePath, JSON.stringify(visit) + '\n', { encoding: 'utf8' });

        // Emit to admin clients
        adminNamespace.emit('visit', visit);
        res.status(204).end();
    } catch (error) {
        console.error('Error logging visit:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get historical clicks
app.get('/api/clicks', async (req, res) => {
    try {
        const filePath = path.join(process.cwd(), 'data', 'clicks.json');
        let clicks = [];

        try {
            const data = await fs.readFile(filePath, 'utf8');
            clicks = data.trim().split('\n').map(line => JSON.parse(line));
        } catch (e) {
            // File doesn't exist or is empty, return empty array
        }

        res.json(clicks);
    } catch (error) {
        console.error('Error reading clicks:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// File size check middleware
async function checkFileSize(req, res, next) {
    try {
        const filePath = path.join(process.cwd(), 'data', 'clicks.json');
        const stats = await fs.stat(filePath);
        
        // If file is > 1MB, rotate it
        if (stats.size > 1024 * 1024) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = `${filePath}.${timestamp}`;
            await fs.rename(filePath, backupPath);
        }
    } catch (error) {
        // File doesn't exist yet, that's fine
    }
    next();
}

// Add file size check before logging visits
app.post('/api/log-visit', checkFileSize);

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
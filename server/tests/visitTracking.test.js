import { describe, test, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { logVisitToDiscord } from '../utils/discordLogger.js';
import logger from '../utils/logger.js';
import { validateVisitData } from '../middleware/validation.js';
import { apiLimiter } from '../middleware/security.js';

// Mock dependencies
vi.mock('../utils/discordLogger.js');
vi.mock('../utils/logger.js', () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
    }
}));
vi.mock('../middleware/security.js', () => ({
    apiLimiter: (req, res, next) => next()
}));

const app = express();
app.use(express.json());
app.post('/api/log-visit', validateVisitData, (req, res) => {
    res.status(200).json({ success: true });
});

describe('Visit Tracking Endpoint', () => {
    test('Successfully logs a valid visit', async () => {
        const visitData = {
            url: 'https://example.com',
            deviceType: 'desktop',
            screenResolution: '1920x1080',
            timezone: 'America/New_York',
            languages: 'en-US',
            webrtcIPs: ['192.168.1.1']
        };

        const response = await request(app)
            .post('/api/log-visit')
            .send(visitData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

    test('Rejects invalid visit data', async () => {
        const visitData = {
            url: 'invalid-url'
        };

        const response = await request(app)
            .post('/api/log-visit')
            .send(visitData);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation failed');
    });
});

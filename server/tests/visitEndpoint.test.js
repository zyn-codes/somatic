import { describe, test, expect, vi, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import express from 'express';
import { validateVisitData } from '../middleware/validation.js';
import logger from '../utils/logger.js';
import { logVisitToDiscord } from '../utils/discordLogger.js';

vi.mock('../utils/logger.js', () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
    }
}));

vi.mock('../utils/discordLogger.js', () => ({
    logVisitToDiscord: vi.fn()
}));

describe('Visit Tracking Endpoint Integration Tests', () => {
    let app;
    let server;
    let request;

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.post('/api/log-visit', validateVisitData, async (req, res) => {
            try {
                await logVisitToDiscord(req.body);
                res.status(200).json({ success: true, visitId: req.body.timestamp });
            } catch (error) {
                logger.default.error('Error logging visit', { error: error.message });
                res.status(500).json({ error: 'Server error' });
            }
        });

        request = supertest(app);
    });

    afterAll(() => {
        if (server) {
            server.close();
        }
    });

    test('Successfully logs a valid visit', async () => {
        const visitData = {
            url: 'https://example.com',
            deviceType: 'desktop',
            screenResolution: '1920x1080',
            timezone: 'America/New_York',
            languages: 'en-US',
            webrtcIPs: ['192.168.1.1'],
            timestamp: new Date().toISOString()
        };

        const response = await request
            .post('/api/log-visit')
            .send(visitData)
            .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('visitId');
        expect(logger.default.info).toHaveBeenCalled();
        expect(logVisitToDiscord).toHaveBeenCalledWith(expect.objectContaining(visitData));
    });

    test('Rejects invalid visit data', async () => {
        const invalidData = {
            url: 'not-a-url',
            deviceType: 'invalid',
            screenResolution: 'invalid',
        };

        const response = await request
            .post('/api/log-visit')
            .send(invalidData)
            .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation failed');
        expect(response.body.details).toEqual(
            expect.arrayContaining([
                'Invalid URL format',
                'Invalid device type',
                'Invalid screen resolution format (should be WxH)'
            ])
        );
    });

    test('Handles Discord logging errors gracefully', async () => {
        const visitData = {
            url: 'https://example.com',
            deviceType: 'desktop',
            screenResolution: '1920x1080',
            timestamp: new Date().toISOString()
        };

        vi.mocked(logVisitToDiscord).mockRejectedValueOnce(new Error('Discord API error'));

        const response = await request
            .post('/api/log-visit')
            .send(visitData)
            .expect(500);

        expect(response.body).toHaveProperty('error', 'Server error');
        expect(logger.default.error).toHaveBeenCalledWith(
            'Error logging visit',
            expect.objectContaining({ error: 'Discord API error' })
        );
    });
});
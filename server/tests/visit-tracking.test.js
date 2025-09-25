import { describe, test, expect, vi, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { validateVisitData } from '../middleware/validation.js';
import { logVisitToDiscord } from '../utils/discordLogger.js';

// Mock the discord logger
vi.mock('../utils/discordLogger.js', () => ({
    logVisitToDiscord: vi.fn()
}));

// Mock the logger
vi.mock('../utils/logger.js', () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
    }
}));

describe('Visit Tracking Integration Tests', () => {
    let app;
    const validVisitData = {
        url: 'https://example.com',
        deviceType: 'desktop',
        screenResolution: '1920x1080',
        timezone: 'America/New_York',
        languages: 'en-US',
        webrtcIPs: ['192.168.1.1']
    };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.post('/api/log-visit', validateVisitData, async (req, res) => {
            try {
                await logVisitToDiscord(req.body);
                res.status(200).json({ success: true });
            } catch (error) {
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    });

    test('Successfully logs a valid visit', async () => {
        const response = await request(app)
            .post('/api/log-visit')
            .send(validVisitData);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ success: true });
        expect(logVisitToDiscord).toHaveBeenCalledWith(expect.objectContaining(validVisitData));
    });

    test('Rejects invalid visit data', async () => {
        const invalidData = {
            ...validVisitData,
            url: 'not-a-valid-url'
        };

        const response = await request(app)
            .post('/api/log-visit')
            .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body).toEqual(expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining(['Invalid URL format'])
        }));
        expect(logVisitToDiscord).not.toHaveBeenCalled();
    });

    test('Handles Discord logger errors gracefully', async () => {
        vi.mocked(logVisitToDiscord).mockRejectedValueOnce(new Error('Discord API Error'));

        const response = await request(app)
            .post('/api/log-visit')
            .send(validVisitData);

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            error: 'Internal server error'
        });
    });
});
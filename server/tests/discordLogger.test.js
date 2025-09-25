import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { logVisitToDiscord } from '../utils/discordLogger.js';
import logger from '../utils/logger.js';

vi.mock('axios');
vi.mock('../utils/logger.js', () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
    }
}));

describe('Discord Logger Tests', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';
        vi.clearAllMocks();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    test('Successfully sends visit data to Discord', async () => {
        const mockVisit = {
            id: '123',
            timestamp: new Date().toISOString(),
            type: 'page_visit',
            url: 'https://example.com',
            ip: '127.0.0.1',
            personalInfo: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com'
            },
            deviceType: 'desktop'
        };

        axios.post.mockResolvedValueOnce({ status: 200 });

        await logVisitToDiscord(mockVisit);

        expect(axios.post).toHaveBeenCalledWith(
            process.env.DISCORD_WEBHOOK_URL,
            expect.objectContaining({
                username: 'Somatic Visit Logger',
                embeds: expect.arrayContaining([
                    expect.objectContaining({
                        title: expect.stringContaining('New Site Visit')
                    })
                ])
            }),
            expect.any(Object)
        );

        expect(logger.info).toHaveBeenCalledWith(
            'Successfully logged visit to Discord',
            expect.any(Object)
        );
    });

    test('Handles missing webhook URL', async () => {
        delete process.env.DISCORD_WEBHOOK_URL;
        
        const mockVisit = {
            id: '123',
            type: 'page_visit'
        };

        await logVisitToDiscord(mockVisit);

        expect(axios.post).not.toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalledWith(
            'Discord webhook URL not configured. Skipping Discord logging.'
        );
    });

    test('Handles Discord API errors', async () => {
        const mockVisit = {
            id: '123',
            type: 'page_visit'
        };

        const error = new Error('Discord API Error');
        error.response = { status: 429, data: 'Too Many Requests' };
        axios.post.mockRejectedValueOnce(error);

        await expect(logVisitToDiscord(mockVisit)).rejects.toThrow();

        expect(logger.error).toHaveBeenCalledWith(
            'Failed to log visit to Discord',
            expect.objectContaining({
                error: 'Discord API Error'
            })
        );
    });
});
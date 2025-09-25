import { describe, test, expect, vi, beforeEach } from 'vitest';
import { validateVisitData } from '../middleware/validation.js';

// Create logger mock before importing
const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
};

// Mock the logger module
vi.mock('../utils/logger.js', () => ({
    default: mockLogger
}));

// Import logger after mocking
import logger from '../utils/logger.js';

describe('Visit Validation Tests', () => {
    let mockReq;
    let mockRes;
    let nextFunction;

    beforeEach(() => {
        mockReq = {
            body: {
                url: 'https://example.com',
                deviceType: 'desktop',
                screenResolution: '1920x1080',
                timezone: 'America/New_York',
                languages: 'en-US',
                webrtcIPs: ['192.168.1.1']
            },
            id: '123',
            ip: '127.0.0.1',
            headers: {
                'user-agent': 'Mozilla/5.0'
            },
            startTime: Date.now()
        };

        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };

        nextFunction = vi.fn();
        vi.clearAllMocks();
    });

    test('Valid visit data passes validation', () => {
        validateVisitData(mockReq, mockRes, nextFunction);
        expect(nextFunction).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalled();
    });

    test('Invalid URL fails validation', () => {
        mockReq.body.url = 'not-a-url';
        validateVisitData(mockReq, mockRes, nextFunction);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining(['Invalid URL format'])
        }));
    });

    test('Invalid device type fails validation', () => {
        mockReq.body.deviceType = 'invalid-device';
        validateVisitData(mockReq, mockRes, nextFunction);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining(['Invalid device type'])
        }));
    });

    test('Invalid screen resolution fails validation', () => {
        mockReq.body.screenResolution = 'not-resolution';
        validateVisitData(mockReq, mockRes, nextFunction);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining(['Invalid screen resolution format (should be WxH)'])
        }));
    });
});
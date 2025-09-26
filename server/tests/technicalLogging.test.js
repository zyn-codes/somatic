import { describe, it, expect, vi } from 'vitest';
import { technicalLoggingMiddleware } from '../middleware/technicalLogging.js';
import { logTechnicalData, logSecurityEvent } from '../utils/enhancedLogger.js';
import { getIpInfo } from '../utils/ipServices.js';

// Mock dependencies
vi.mock('../utils/enhancedLogger.js', () => ({
  logTechnicalData: vi.fn(),
  logSecurityEvent: vi.fn()
}));

vi.mock('../utils/ipServices.js', () => ({
  getIpInfo: vi.fn()
}));

describe('Technical Logging Middleware', () => {
  const mockNext = vi.fn();
  
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should log technical data from request', async () => {
    const mockReq = {
      ip: '1.2.3.4',
      connection: { remoteAddress: '1.2.3.4' },
      originalUrl: '/test',
      method: 'POST',
      headers: {
        'user-agent': 'test-agent',
        'referer': 'http://test.com'
      },
      body: {
        technicalData: {
          device: { type: 'desktop' }
        }
      },
      session: {
        id: 'test-session',
        isNew: true
      }
    };

    const mockRes = {};

    getIpInfo.mockResolvedValueOnce({
      geoInfo: {
        country: 'US',
        city: 'Test City'
      },
      vpnDetected: false,
      score: 10
    });

    await technicalLoggingMiddleware(mockReq, mockRes, mockNext);

    expect(logTechnicalData).toHaveBeenCalledWith(
      expect.objectContaining({
        ip: expect.any(Object),
        request: expect.any(Object),
        client: expect.any(Object),
        session: expect.any(Object),
        timestamp: expect.any(String)
      })
    );

    expect(mockNext).toHaveBeenCalled();
  });

  it('should log security events for suspicious traffic', async () => {
    const mockReq = {
      ip: '1.2.3.4',
      headers: {},
      body: {}
    };

    getIpInfo.mockResolvedValueOnce({
      vpnDetected: true,
      score: 85,
      reasons: ['VPN detected']
    });

    await technicalLoggingMiddleware(mockReq, {}, mockNext);

    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'high_risk_visitor',
        ip: '1.2.3.4',
        score: 85
      })
    );
  });

  it('should continue execution even if logging fails', async () => {
    const mockReq = {
      ip: '1.2.3.4',
      headers: {},
      body: {}
    };

    getIpInfo.mockRejectedValueOnce(new Error('Test error'));

    await technicalLoggingMiddleware(mockReq, {}, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});
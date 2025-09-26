import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getIpInfo, isCloudProvider, cache } from '../utils/ipServices.js';
import axios from 'axios';

// Mock axios
vi.mock('axios');

describe('IP Services', () => {
  describe('isCloudProvider', () => {
    it('should detect AWS instances', () => {
      expect(isCloudProvider('Amazon AWS', 'AS16509')).toBe(true);
    });

    it('should detect Google Cloud instances', () => {
      expect(isCloudProvider('Google Cloud', 'AS15169')).toBe(true);
    });

    it('should return false for regular ISPs', () => {
      expect(isCloudProvider('Comcast Cable', 'AS7922')).toBe(false);
    });
  });

  describe('getIpInfo', () => {
    const mockHeaders = {
      'user-agent': 'test-agent',
      'x-forwarded-for': '1.2.3.4',
    };

    beforeEach(() => {
      vi.resetAllMocks();
      // Ensure cache does not leak between tests
      if (cache && typeof cache.flushAll === 'function') {
        cache.flushAll();
      }
    });

    it('should detect VPN/proxy connections', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          country_name: 'United States',
          city: 'Chicago',
          region: 'Illinois',
          timezone: 'America/Chicago',
          org: 'NordVPN',
          proxy: true,
          vpn: true
        }
      });

      const result = await getIpInfo('1.2.3.4', {}, mockHeaders);
      
      expect(result.vpnDetected).toBe(true);
      expect(result.score).toBeGreaterThan(70);
      expect(result.reasons).toContain('Proxy/VPN flag from ipapi.co');
    });

    it('should handle private IP addresses', async () => {
      const result = await getIpInfo('192.168.1.1', {}, mockHeaders);
      
      expect(result.reasons).toContain('Private IP detected');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should detect suspicious user agents', async () => {
      const suspiciousHeaders = {
        'user-agent': 'tor browser',
      };

      axios.get.mockResolvedValueOnce({
        data: {
          country_name: 'United States',
          city: 'Chicago',
          region: 'Illinois',
          timezone: 'America/Chicago',
          org: 'ISP'
        }
      });

      const result = await getIpInfo('1.2.3.4', {}, suspiciousHeaders);
      
      expect(result.uaScore).toBe(100);
      expect(result.reasons).toContain('Suspicious User-Agent detected');
    });

    it('should handle API failures gracefully', async () => {
      axios.get.mockRejectedValueOnce(new Error('API Error'));

      const result = await getIpInfo('1.2.3.4', {}, mockHeaders);
      
      expect(result.reasons).toContain('ipapi.co failed');
      expect(result.geoInfo).toBeDefined();
    });
  });
});
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logTechnicalData, logFormSubmission, logSecurityEvent, logError } from '../utils/enhancedLogger.js';
import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Mock winston
vi.mock('winston', () => ({
  default: {
    createLogger: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    })),
    format: {
      combine: vi.fn(),
      timestamp: vi.fn(),
      json: vi.fn(),
      printf: vi.fn(),
      errors: vi.fn(),
      colorize: vi.fn(),
      simple: vi.fn()
    },
    transports: {
      Console: class {},
      DailyRotateFile: class {}
    }
  }
}));

describe('Enhanced Logger', () => {
  const mockData = {
    ip: '1.2.3.4',
    userAgent: 'test-agent',
    timestamp: new Date().toISOString()
  };

  describe('Technical Data Logging', () => {
    it('should log technical data with correct format', () => {
      logTechnicalData(mockData);
      
      expect(winston.createLogger().info).toHaveBeenCalledWith(
        'Technical data collected',
        expect.objectContaining({
          type: 'technical_data',
          technicalData: mockData
        })
      );
    });
  });

  describe('Form Submission Logging', () => {
    const mockFormData = {
      id: 'test-id',
      personalInfo: { name: 'Test User' }
    };

    it('should log form submissions with technical data', () => {
      logFormSubmission(mockFormData, mockData);
      
      expect(winston.createLogger().info).toHaveBeenCalledWith(
        'Form submitted',
        expect.objectContaining({
          type: 'form_submission',
          formData: mockFormData,
          technicalData: mockData
        })
      );
    });
  });

  describe('Security Event Logging', () => {
    const mockSecurityEvent = {
      type: 'vpn_detected',
      ip: '1.2.3.4',
      score: 85
    };

    it('should log security events with warning level', () => {
      logSecurityEvent(mockSecurityEvent);
      
      expect(winston.createLogger().warn).toHaveBeenCalledWith(
        'Security event detected',
        expect.objectContaining({
          type: 'security_event',
          ...mockSecurityEvent
        })
      );
    });
  });

  describe('Error Logging', () => {
    const mockError = new Error('Test error');
    const mockContext = { userId: 'test-user' };

    it('should log errors with stack trace and context', () => {
      logError(mockError, mockContext);
      
      expect(winston.createLogger().error).toHaveBeenCalledWith(
        'Error occurred',
        expect.objectContaining({
          type: 'error',
          error: mockError.message,
          stack: mockError.stack,
          ...mockContext
        })
      );
    });
  });
});
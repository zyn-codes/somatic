import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Configuration
const MAX_LOG_SIZE = '50m';
const MAX_LOG_FILES = '30d';
const LOG_RETENTION = '90d';

// Ensure logs directory exists with proper permissions
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true, mode: 0o755 });
}

// Get system info for metadata
const getSystemInfo = () => ({
    hostname: os.hostname(),
    platform: os.platform(),
    type: os.type(),
    release: os.release(),
    arch: os.arch(),
    uptime: os.uptime(),
    loadavg: os.loadavg(),
    memory: {
        total: os.totalmem(),
        free: os.freemem(),
        usedPercent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
    },
    cpus: os.cpus().length,
    pid: process.pid,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
});

// Create a cache for system info to avoid frequent calls
let systemInfoCache = null;
let systemInfoLastUpdate = 0;
const SYSTEM_INFO_TTL = 60000; // 1 minute

const getSystemInfoCached = () => {
    const now = Date.now();
    if (!systemInfoCache || (now - systemInfoLastUpdate) > SYSTEM_INFO_TTL) {
        systemInfoCache = getSystemInfo();
        systemInfoLastUpdate = now;
    }
    return systemInfoCache;
};

// Custom formatter for detailed logs
const detailedFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const systemInfo = getSystemInfoCached();
    return JSON.stringify({
        timestamp,
        level,
        message,
        ...meta,
        system: systemInfo,
        processInfo: {
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
            pid: process.pid,
            ppid: process.ppid
        }
    });
});

// Custom log format with error stack traces and metadata
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true }),
    winston.format.metadata(),
    detailedFormat
);

// Create logger instance with enhanced configuration
const logger = winston.createLogger({
    format: logFormat,
    defaultMeta: { 
        service: 'form-service',
        version: process.env.npm_package_version
    },
    transports: [
        // Error log with high priority
        new DailyRotateFile({
            filename: path.join(logsDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: MAX_LOG_SIZE,
            maxFiles: MAX_LOG_FILES,
            tailable: true,
            zippedArchive: true,
            auditFile: path.join(logsDir, 'error-audit.json')
        }),
        // Combined log for all levels
        new DailyRotateFile({
            filename: path.join(logsDir, 'combined-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: MAX_LOG_SIZE,
            maxFiles: MAX_LOG_FILES,
            tailable: true,
            zippedArchive: true,
            auditFile: path.join(logsDir, 'combined-audit.json')
        }),
        // Technical data log
        new DailyRotateFile({
            filename: path.join(logsDir, 'technical-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d',
            // Custom filter for technical data
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
                winston.format.printf(({ timestamp, technicalData, ip, ...meta }) => {
                    return JSON.stringify({
                        timestamp,
                        ip,
                        ...technicalData,
                        ...meta
                    });
                })
            )
        }),
        // Form submissions log
        new DailyRotateFile({
            filename: path.join(logsDir, 'submissions-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d'
        })
    ]
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// Log technical data

export const logTechnicalData = (data) => {
    try {
        const systemInfo = getSystemInfoCached();
        logger.info('Technical data collected', {
            type: 'technical_data',
            technicalData: data,
            system: systemInfo,
            runtime: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch
            }
        });
    } catch (e) {
        fallbackLog('technical-fallback.log', {
            error: e.message,
            data
        });
    }
};

// Log form submission

export const logFormSubmission = (formData, technicalData) => {
    try {
        const systemInfo = getSystemInfoCached();
        logger.info('Form submitted', {
            type: 'form_submission',
            formData,
            technicalData,
            system: systemInfo,
            process: {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage()
            }
        });
    } catch (e) {
        fallbackLog('submissions-fallback.log', {
            error: e.message,
            formData,
            technicalData
        });
    }
};

// Log security event

export const logSecurityEvent = (event) => {
    try {
        const systemInfo = getSystemInfoCached();
        logger.warn('Security event detected', {
            type: 'security_event',
            ...event,
            system: systemInfo,
            process: {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                user: process.getuid?.(),
                group: process.getgid?.()
            }
        });
    } catch (e) {
        fallbackLog('security-fallback.log', {
            error: e.message,
            event
        });
    }
};

// Log error with context

export const logError = (error, context = {}) => {
    try {
        const systemInfo = getSystemInfoCached();
        logger.error('Error occurred', {
            type: 'error',
            error: {
                message: error.message,
                name: error.name,
                stack: error.stack,
                code: error.code
            },
            context,
            system: systemInfo,
            process: {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                resourceUsage: process.resourceUsage?.()
            }
        });
    } catch (e) {
        fallbackLog('error-fallback.log', {
            error: e.message,
            originalError: {
                message: error.message,
                stack: error.stack
            },
            context
        });
    }
};

export default logger;
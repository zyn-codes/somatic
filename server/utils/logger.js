import winston from 'winston';
import path from 'path';

// Define custom formats for different log types
const baseFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.metadata()
);

const errorFormat = winston.format.combine(
    baseFormat,
    winston.format.json(),
    winston.format.prettyPrint()
);

const requestFormat = winston.format.combine(
    baseFormat,
    winston.format.printf(({ timestamp, level, message, metadata }) => {
        const { method, url, status, responseTime, ip } = metadata;
        return `${timestamp} [${level}] ${method} ${url} - Status: ${status} - Time: ${responseTime}ms - IP: ${ip}`;
    })
);

// Create separate loggers for different concerns
const errorLogger = winston.createLogger({
    format: logFormat,
    defaultMeta: {
        service: 'somatic-server',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
    },
    transports: [
        // Error logs with stack traces
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
                winston.format.prettyPrint()
            )
        }),
        // All logs with basic info
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true
        }),
        // Separate visit logs
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'visits.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 10,
            tailable: true,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        })
    ]
});

// Enhanced development logging
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, metadata }) => {
                return `${timestamp} [${level}]: ${message} ${Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : ''}`;
            })
        ),
        level: 'debug'
    }));
}

// Request tracking logger
const requestLogger = winston.createLogger({
    format: requestFormat,
    defaultMeta: {
        service: 'somatic-server',
        environment: process.env.NODE_ENV || 'development'
    },
    transports: [
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'requests.log'),
            maxsize: 5242880,
            maxFiles: 5,
            tailable: true
        })
    ]
});

// Performance monitoring logger
const performanceLogger = winston.createLogger({
    format: baseFormat,
    defaultMeta: {
        service: 'somatic-server',
        environment: process.env.NODE_ENV || 'development'
    },
    transports: [
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'performance.log'),
            maxsize: 5242880,
            maxFiles: 5,
            tailable: true
        })
    ]
});

// Security events logger
const securityLogger = winston.createLogger({
    format: baseFormat,
    defaultMeta: {
        service: 'somatic-server',
        environment: process.env.NODE_ENV || 'development'
    },
    transports: [
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'security.log'),
            maxsize: 5242880,
            maxFiles: 5,
            tailable: true
        })
    ]
});

// Utility functions
const logRequest = (req, res, responseTime) => {
    requestLogger.info('Request processed', {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        responseTime,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
};

const logPerformance = (metric) => {
    performanceLogger.info('Performance metric', {
        ...metric,
        timestamp: new Date().toISOString()
    });
};

const logSecurity = (event, details) => {
    securityLogger.warn('Security event', {
        event,
        ...details,
        timestamp: new Date().toISOString()
    });
};

export {
    errorLogger as default,
    requestLogger,
    performanceLogger,
    securityLogger,
    logRequest,
    logPerformance,
    logSecurity
};
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
    format: logFormat,
    defaultMeta: { service: 'form-service' },
    transports: [
        // Error log
        new DailyRotateFile({
            filename: path.join(logsDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxFiles: '30d'
        }),
        // Combined log
        new DailyRotateFile({
            filename: path.join(logsDir, 'combined-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d'
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
    logger.info('Technical data collected', {
        type: 'technical_data',
        technicalData: data
    });
};

// Log form submission
export const logFormSubmission = (formData, technicalData) => {
    logger.info('Form submitted', {
        type: 'form_submission',
        formData,
        technicalData
    });
};

// Log security event
export const logSecurityEvent = (event) => {
    logger.warn('Security event detected', {
        type: 'security_event',
        ...event
    });
};

// Log error with context
export const logError = (error, context = {}) => {
    logger.error('Error occurred', {
        type: 'error',
        error: error.message,
        stack: error.stack,
        ...context
    });
};

export default logger;
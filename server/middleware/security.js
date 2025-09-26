import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Rate limiting middleware
export const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// API specific rate limiter
export const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    message: { error: 'Too many API requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// WebSocket rate limiter settings
export const wsRateLimit = {
    windowMs: 60 * 1000, // 1 minute
    maxConnections: 10, // max 10 connections per IP per minute
};

// Helmet middleware configuration with enhanced security
export const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // Consider removing unsafe-inline if possible
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            connectSrc: ["'self'", 'ws:', 'wss:'],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
});
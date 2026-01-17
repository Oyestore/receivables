import rateLimit = require('express-rate-limit');
import RedisStore = require('rate-limit-redis');
import { createClient } from 'redis';

/**
 * Rate Limiting Configuration
 * Protects API endpoints from abuse and DDoS attacks
 */

// Redis client for distributed rate limiting
const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
});

redisClient.connect().catch(console.error);

// Store for distributed rate limiting across multiple servers
const redisStore = new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    prefix: 'rl:',
} as any);

/**
 * Global API Rate Limiter
 * 100 requests per 15 minutes per IP
 */
export const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes',
    },
    store: redisStore as any,
    skip: (req: any) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/metrics';
    },
} as any);

/**
 * Strict Rate Limiter for Authentication Endpoints
 * 5 requests per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: '15 minutes',
    },
    store: redisStore as any,
    skipSuccessfulRequests: true, // Don't count successful auth requests
} as any);

/**
 * Moderate Rate Limiter for Data-Heavy Endpoints
 * 20 requests per 15 minutes per IP
 */
export const dataHeavyRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
        error: 'Too many data requests, please try again later.',
        retryAfter: '15 minutes',
    },
    store: redisStore as any,
} as any);

/**
 * Webhook Rate Limiter
 * 1000 requests per 15 minutes (for high-volume webhooks)
 */
export const webhookRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: {
        error: 'Webhook rate limit exceeded.',
    },
    store: redisStore as any,
    keyGenerator: (req: any) => {
        // Use webhook signature or specific header for identification
        return req.headers['x-webhook-signature'] as string || req.ip;
    },
} as any);

/**
 * ML Prediction Rate Limiter
 * 50 requests per 15 minutes per user
 */
export const mlPredictionRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: {
        error: 'ML prediction rate limit exceeded. Please batch your requests.',
        retryAfter: '15 minutes',
    },
    store: redisStore as any,
    keyGenerator: (req: any) => {
        // Rate limit per user, not per IP
        return req.user?.id || req.headers['x-tenant-id'] as string || req.ip;
    },
} as any);

/**
 * File Upload Rate Limiter
 * 10 uploads per hour per user
 */
export const fileUploadRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: {
        error: 'File upload limit exceeded. Maximum 10 files per hour.',
        retryAfter: '1 hour',
    },
    store: redisStore as any,
    keyGenerator: (req: any) => {
        return req.user?.id || req.headers['x-tenant-id'] as string || req.ip;
    },
} as any);

/**
 * External API Rate Limiter
 * Prevents excessive calls to external services
 * 30 requests per 15 minutes per tenant
 */
export const externalAPIRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: {
        error: 'External API rate limit exceeded. Please reduce request frequency.',
        retryAfter: '15 minutes',
    },
    store: redisStore as any,
    keyGenerator: (req: any) => {
        return req.headers['x-tenant-id'] as string || req.user?.tenantId || req.ip;
    },
} as any);

/**
 * Usage in main.ts:
 * 
 * import { 
 *   globalRateLimiter, 
 *   authRateLimiter,
 *   mlPredictionRateLimiter 
 * } from './config/rate-limit.config';
 * 
 * // Apply global rate limiter
 * app.use(globalRateLimiter);
 * 
 * // Apply specific rate limiters to routes
 * app.use('/auth', authRateLimiter);
 * app.use('/ml', mlPredictionRateLimiter);
 * app.use('/integrations', externalAPIRateLimiter);
 * app.use('/documents/upload', fileUploadRateLimiter);
 * app.use('/webhooks', webhookRateLimiter);
 */

export const rateLimitConfig = {
    global: globalRateLimiter,
    auth: authRateLimiter,
    dataHeavy: dataHeavyRateLimiter,
    webhook: webhookRateLimiter,
    mlPrediction: mlPredictionRateLimiter,
    fileUpload: fileUploadRateLimiter,
    externalAPI: externalAPIRateLimiter,
};

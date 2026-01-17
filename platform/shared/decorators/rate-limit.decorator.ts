import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

/**
 * Decorator to set custom rate limits for specific routes
 * @param windowMs - Time window in milliseconds
 * @param max - Maximum number of requests allowed in the window
 */
export const RateLimit = (windowMs: number, max: number) =>
    SetMetadata(RATE_LIMIT_KEY, { windowMs, max });

/**
 * Predefined rate limit configurations
 */
export const RateLimits = {
    // Strict limits for authentication endpoints (5 requests per 15 minutes)
    AUTH: {
        windowMs: 15 * 60 * 1000,
        max: 5,
    },
    // Medium limits for sensitive operations (20 requests per 15 minutes)
    SENSITIVE: {
        windowMs: 15 * 60 * 1000,
        max: 20,
    },
    // Standard limits for regular API calls (100 requests per 15 minutes)
    STANDARD: {
        windowMs: 15 * 60 * 1000,
        max: 100,
    },
    // Lenient limits for public endpoints (300 requests per 15 minutes)
    PUBLIC: {
        windowMs: 15 * 60 * 1000,
        max: 300,
    },
};

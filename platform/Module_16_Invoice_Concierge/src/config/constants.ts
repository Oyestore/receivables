/**
 * API Endpoints Configuration
 * Centralized configuration for all external service endpoints
 * Used across Module 16 integration services
 */

export const API_ENDPOINTS = {
    // Module 10: Orchestration
    ORCHESTRATION: {
        EVENTS: '/api/orchestration/events',
        LISTENERS: '/api/orchestration/listeners',
    },

    // Module 11: Notifications
    NOTIFICATIONS: {
        WHATSAPP: '/api/notifications/whatsapp',
        SMS: '/api/notifications/sms',
        EMAIL: '/api/notifications/email',
    },

    // Module 03: Payment Integration
    PAYMENTS: {
        BASE: '/api/payments',
        BY_ID: (id: string) => `/api/payments/${id}`,
    },

    // Module 08: Dispute Resolution
    DISPUTES: {
        TICKETS: '/api/disputes/tickets',
        TICKET_BY_ID: (id: string) => `/api/disputes/tickets/${id}`,
    },

    // Module 09: Referral Engine
    REFERRALS: {
        CREATE: '/api/referrals/create',
        TRACK_SHARE: '/api/referrals/track-share',
        STATS: (customerId: string) => `/api/referrals/stats/${customerId}`,
    },
} as const;

/**
 * Application Constants
 */
export const CONSTANTS = {
    // Currency conversion
    PAISE_TO_RUPEES: 100,
    CURRENCY_CODE: 'INR',

    // Referral rewards
    REFERRAL_REWARD_AMOUNT: 500, // ₹500 per successful referral
    REWARD_CURRENCY: 'INR',

    // Retry configuration
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_BASE_MS: 1000, // 1 second base delay
    REQUEST_TIMEOUT_MS: 5000, // 5 seconds

    // Module identification
    MODULE_NAME: 'module_16_concierge',
    MODULE_VERSION: '1.0.0',
} as const;

/**
 * Environment variable keys
 */
export const ENV_KEYS = {
    BACKEND_URL: 'BACKEND_URL',
    FRONTEND_URL: 'FRONTEND_URL',
    RAZORPAY_KEY_ID: 'RAZORPAY_KEY_ID',
    RAZORPAY_WEBHOOK_SECRET: 'RAZORPAY_WEBHOOK_SECRET',
} as const;

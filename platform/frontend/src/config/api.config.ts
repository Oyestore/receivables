/**
 * Centralized API Configuration
 * Single source of truth for all API settings
 */

const getBaseURL = (): string => {
    // Check environment-specific variable
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    // Fallback based on environment
    if (import.meta.env.MODE === 'production') {
        return 'https://api.smeplatform.com';
    }

    if (import.meta.env.MODE === 'staging') {
        return 'https://api-staging.smeplatform.com';
    }

    // Development default
    return 'http://localhost:4000';
};

export const API_CONFIG = {
    baseURL: getBaseURL(),
    timeout: 30000, // 30 seconds
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: false,
} as const;

// Standard token key - use this everywhere
export const TOKEN_KEY = 'authToken' as const;

// API endpoints (relative to baseURL)
export const API_ENDPOINTS = {
    // Auth
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',

    // Invoices
    INVOICES: '/api/tenant/:tenantId/invoices',
    INVOICE_BY_ID: '/api/tenant/:tenantId/invoices/:id',

    // Payments
    PAYMENTS: '/api/tenant/:tenantId/payments',
    PAYMENT_BY_ID: '/api/tenant/:tenantId/payments/:id',

    // Analytics
    ANALYTICS_DASHBOARD: '/api/analytics/dashboard',
    ANALYTICS_REPORTS: '/api/analytics/reports',

    // Health
    HEALTH: '/health',
    METRICS: '/metrics',
} as const;

// Helper to replace path parameters
export const buildEndpoint = (
    endpoint: string,
    params: Record<string, string>
): string => {
    let path = endpoint;
    Object.entries(params).forEach(([key, value]) => {
        path = path.replace(`:${key}`, value);
    });
    return path;
};

export default API_CONFIG;

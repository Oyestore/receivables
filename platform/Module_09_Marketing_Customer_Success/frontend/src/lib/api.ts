import axios from 'axios';

/**
 * Axios API Client for Module 09
 */

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3009/api/v1',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
apiClient.interceptors.request.use(
    (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default apiClient;

/**
 * API Service Functions
 */

export const customerSuccessApi = {
    // Health metrics
    getHealthMetrics: (customerId: string) =>
        apiClient.get(`/customer-success/health/${customerId}`),

    // Churn prediction (Single Customer)
    getChurnPrediction: (customerId: string) =>
        apiClient.get(`/customer-success/churn/predict/${customerId}`),

    // At-Risk Customers (Tenant List)
    getAtRiskCustomers: (tenantId: string) =>
        apiClient.get(`/customer-success/churn/at-risk/${tenantId}`),

    getPortfolioHealthSummary: (tenantId: string) =>
        apiClient.get(`/customer-success/health/portfolio/${tenantId}`),

    // Usage analytics
    getUsageAnalytics: (customerId: string) =>
        apiClient.get(`/customer-success/usage/${customerId}`),

    // Feedback
    getNPSMetrics: (tenantId: string, period: string = 'month') =>
        apiClient.get(`/customer-success/metrics/nps`, { params: { tenantId, period } }),

    // Expansion
    getExpansionOpportunities: (tenantId: string) =>
        apiClient.post(`/customer-success/opportunities/identify`, { tenantId }),
};

export const growthApi = {
    // Viral opportunities
    getViralOpportunities: (userId: string) =>
        apiClient.get(`/growth/viral/opportunities/${userId}`),

    // Referrals
    getReferralStats: (userId: string) =>
        apiClient.get(`/growth/referrals/dashboard/${userId}`),

    sendReferral: (data: any) =>
        apiClient.post(`/growth/referrals/send`, data),

    // Community
    getCommunityPosts: (params?: any) =>
        apiClient.get(`/growth/community/trending`, { params }),

    // Network intelligence
    getBenchmarks: (tenantId: string, industry: string) =>
        apiClient.get(`/growth/network/benchmarks`, { params: { tenantId, industry } }),
};

export const analyticsApi = {
    // Revenue analytics
    getRevenueMetrics: (tenantId: string, startDate: string, endDate: string) =>
        apiClient.get(`/analytics/revenue/metrics`, { params: { tenantId, startDate, endDate } }),

    // Reports
    generateReport: (templateId: string) =>
        apiClient.post(`/analytics/reports/generate/${templateId}`),
};

export const partnerApi = {
    // Partner management
    getPartnerPerformance: (partnerId: string, startDate: string, endDate: string) =>
        apiClient.get(`/partners/performance/${partnerId}`, { params: { startDate, endDate } }),

    // Commissions
    getCommissionReport: (partnerId: string) =>
        apiClient.get(`/partners/commissions/${partnerId}`),
};

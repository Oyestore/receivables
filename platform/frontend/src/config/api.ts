import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor for auth token
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken'); // FIXED: Changed from 'auth_token' to 'authToken'
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Redirect to login or refresh token
            localStorage.removeItem('authToken'); // FIXED: Changed from 'auth_token' to 'authToken'
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default apiClient;

// Analytics API endpoints
// Analytics API endpoints
export const analyticsAPI = {
    getDashboard: (tenantId: string) => apiClient.get(`/api/analytics/dashboard`),
    getRevenueTrend: (tenantId: string) => apiClient.get(`/api/analytics/revenue-trend`),
};

// Invoice API endpoints (Assuming standard /api/tenant pattern)
export const invoiceAPI = {
    getInvoices: (tenantId: string) => apiClient.get(`/api/tenant/${tenantId}/invoices`),
    getInvoiceById: (tenantId: string, id: string) => apiClient.get(`/api/tenant/${tenantId}/invoices/${id}`),
    createInvoice: (tenantId: string, data: any) => apiClient.post(`/api/tenant/${tenantId}/invoices`, data),
    refreshJourney: (tenantId: string, id: string) => apiClient.post(`/api/tenant/${tenantId}/invoices/${id}/refresh-journey`),
};

// Payment API endpoints (Assuming standard /api/tenant pattern)
export const paymentAPI = {
    getPayments: (tenantId: string) => apiClient.get(`/api/tenant/${tenantId}/payments`),
    getPaymentMethods: (tenantId: string) => apiClient.get(`/api/tenant/${tenantId}/payment-methods`),
    addPaymentMethod: (tenantId: string, data: any) => apiClient.post(`/api/tenant/${tenantId}/payment-methods`, data),
    deletePaymentMethod: (tenantId: string, id: string) => apiClient.delete(`/api/tenant/${tenantId}/payment-methods/${id}`),
    getSettlements: (tenantId: string) => apiClient.get(`/api/tenant/${tenantId}/settlements`),
};

// Financing API endpoints
export const financingAPI = {
    getOffers: (tenantId: string) => apiClient.get(`/api/tenant/${tenantId}/financing/offers`),
    applyForFinancing: (tenantId: string, data: any) => apiClient.post(`/api/tenant/${tenantId}/financing/requests`, data), // FIXED: Removed duplicate /api
    getApplications: (tenantId: string) => apiClient.get(`/api/tenant/${tenantId}/financing/requests`), // FIXED: Removed duplicate /api
};

// Credit API endpoints
export const creditAPI = {
    getCreditProfile: (tenantId: string) => apiClient.get(`/api/tenant/${tenantId}/credit-scoring/self/score`), // FIXED: Removed duplicate /api
    getCreditHistory: (tenantId: string) => apiClient.get(`/api/tenant/${tenantId}/credit-scoring/self/history`), // FIXED: Removed duplicate /api
};

// Milestone API endpoints (M05)
export const milestoneAPI = {
    getProjects: (tenantId: string) => apiClient.get(`/api/tenant/${tenantId}/projects`), // Will create standard controller
    getProjectDetails: (tenantId: string, id: string) => apiClient.get(`/api/tenant/${tenantId}/projects/${id}`),
    createProject: (tenantId: string, data: any) => apiClient.post(`/api/tenant/${tenantId}/projects`, data),
};

// Dispute API endpoints (M08)
export const disputeAPI = {
    getDisputes: (tenantId: string) => apiClient.get(`/api/v1/disputes/cases`, { params: { tenantId } }), // FIXED: Removed duplicate /api
    createDispute: (tenantId: string, data: any) => apiClient.post(`/api/v1/disputes/cases`, { ...data, tenantId }), // FIXED: Removed duplicate /api
    getDisputeMessages: (tenantId: string, id: string) => apiClient.get(`/api/v1/disputes/cases/${id}`), // FIXED: Removed duplicate /api
    sendMessage: (tenantId: string, id: string, message: string) => console.warn('Mock: Send Message not impl in backend'),
};

// Marketing API endpoints (M09)
export const marketingAPI = {
    getCampaigns: (tenantId: string) => apiClient.get(`/api/tenant/${tenantId}/campaigns`), // FIXED: Removed duplicate /api
    createCampaign: (tenantId: string, data: any) => apiClient.post(`/api/tenant/${tenantId}/campaigns`, data), // FIXED: Removed duplicate /api
    getLeads: (tenantId: string) => apiClient.get(`/api/leads`),
};

// Concierge API endpoints (M16)
export const conciergeAPI = {
    // Start session: POST /api/v1/concierge/session
    startSession: (tenantId: string, persona: string, referenceId?: string) =>
        apiClient.post(`/api/v1/concierge/session`, { tenantId, persona, referenceId }),

    // Send message: POST /api/v1/concierge/:sessionId/message
    sendMessage: (sessionId: string, message: string, language: string = 'en') =>
        apiClient.post(`/api/v1/concierge/${sessionId}/message`, { message, language }),

    // Get history: GET /api/v1/concierge/session/:sessionId
    getSession: (sessionId: string) => apiClient.get(`/api/v1/concierge/session/${sessionId}`),
};

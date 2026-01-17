import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const AnalyticsService = {
    getRevenueMetrics: async (tenantId: string, startDate: string, endDate: string) => {
        const response = await axios.get(`${API_URL}/analytics/revenue`, {
            params: { tenantId, startDate, endDate }
        });
        return response.data;
    },

    getAgingReport: async (tenantId: string) => {
        const response = await axios.get(`${API_URL}/analytics/aging-report`, {
            params: { tenantId }
        });
        return response.data;
    }
};

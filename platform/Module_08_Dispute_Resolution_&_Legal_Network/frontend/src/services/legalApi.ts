import api from './api';
import { LegalProviderProfile, ApiResponse } from '../types/dispute.types';

export const legalApi = {
    // Get all lawyers
    getAll: async (params?: {
        specialization?: string;
        status?: string;
        city?: string;
    }): Promise<LegalProviderProfile[]> => {
        const { data } = await api.get<ApiResponse<LegalProviderProfile[]>>('/api/v1/legal/providers', { params });
        return data.data;
    },

    // Get lawyer by ID
    getById: async (id: string): Promise<LegalProviderProfile> => {
        const { data } = await api.get<ApiResponse<LegalProviderProfile>>(`/api/v1/legal/providers/${id}`);
        return data.data;
    },

    // Get top lawyers (by rating)
    getTopLawyers: async (limit: number = 10): Promise<LegalProviderProfile[]> => {
        const { data } = await api.get<ApiResponse<LegalProviderProfile[]>>('/api/v1/legal/providers/top', {
            params: { limit },
        });
        return data.data;
    },

    // Match lawyers for dispute
    matchLawyers: async (disputeId: string, tenantId: string): Promise<any> => {
        const { data } = await api.post('/api/v1/legal/match', { disputeId, tenantId });
        return data.data;
    },
};

export default legalApi;

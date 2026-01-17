import api from './api';
import { DisputeCase, ApiResponse, PaginatedResponse, PredictionResult, RiskAssessment } from '../types/dispute.types';

export const disputeApi = {
    // Get all disputes
    getAll: async (params?: {
        status?: string;
        priority?: string;
        customerId?: string;
        page?: number;
        limit?: number;
    }): Promise<DisputeCase[]> => {
        const { data } = await api.get<ApiResponse<DisputeCase[]>>('/api/v1/disputes/cases', { params });
        return data.data;
    },

    // Get dispute by ID
    getById: async (id: string): Promise<DisputeCase> => {
        const { data } = await api.get<ApiResponse<DisputeCase>>(`/api/v1/disputes/cases/${id}`);
        return data.data;
    },

    // Create new dispute
    create: async (dispute: {
        tenantId: string;
        invoiceId: string;
        customerId: string;
        customerName: string;
        type: string;
        disputedAmount: number;
        description: string;
        priority?: string;
        createdBy: string;
    }): Promise<DisputeCase> => {
        const { data } = await api.post<ApiResponse<DisputeCase>>('/api/v1/disputes/cases', dispute);
        return data.data;
    },

    // Update dispute status
    updateStatus: async (id: string, status: string, updatedBy: string, notes?: string): Promise<DisputeCase> => {
        const { data } = await api.patch<ApiResponse<DisputeCase>>(`/api/v1/disputes/cases/${id}/status`, {
            status,
            updatedBy,
            notes,
        });
        return data.data;
    },

    // Add evidence
    addEvidence: async (id: string, evidence: { type: string; data: any; addedBy: string }): Promise<DisputeCase> => {
        const { data } = await api.post<ApiResponse<DisputeCase>>(`/api/v1/disputes/cases/${id}/evidence`, evidence);
        return data.data;
    },

    // Assign legal provider
    assignProvider: async (id: string, providerId: string, assignedBy: string): Promise<DisputeCase> => {
        const { data } = await api.patch<ApiResponse<DisputeCase>>(
            `/api/v1/disputes/cases/${id}/assign-provider`,
            { providerId, assignedBy }
        );
        return data.data;
    },

    // Get AI prediction
    getPrediction: async (id: string, tenantId: string): Promise<PredictionResult> => {
        const { data } = await api.get<PredictionResult>(
            `/api/v1/disputes/${id}/ai/prediction`,
            { params: { tenantId } }
        );
        return data;
    },

    // Get risk assessment
    getRiskAssessment: async (id: string, tenantId: string): Promise<RiskAssessment> => {
        const { data } = await api.get<RiskAssessment>(
            `/api/v1/disputes/${id}/ai/risk`,
            { params: { tenantId } }
        );
        return data;
    },

    // Get statistics
    getStatistics: async (tenantId: string): Promise<any> => {
        const { data } = await api.get(`/api/v1/disputes/stats/${tenantId}`);
        return data.data;
    },
};

export default disputeApi;

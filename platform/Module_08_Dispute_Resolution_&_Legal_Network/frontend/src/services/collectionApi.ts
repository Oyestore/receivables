import api from './api';
import { CollectionCase, ApiResponse } from '../types/dispute.types';

export const collectionApi = {
    // Get all collections
    getAll: async (params?: {
        status?: string;
        assignedTo?: string;
        page?: number;
        limit?: number;
    }): Promise<CollectionCase[]> => {
        const { data } = await api.get<ApiResponse<CollectionCase[]>>('/api/v1/collections/cases', { params });
        return data.data;
    },

    // Get collection by ID
    getById: async (id: string, tenantId: string): Promise<CollectionCase> => {
        const { data } = await api.get<ApiResponse<any>>(
            `/api/v1/collections/cases/${id}`,
            { params: { tenantId } }
        );
        return data.data.case;
    },

    // Create new collection
    create: async (collection: {
        tenantId: string;
        disputeId?: string;
        customerId: string;
        customerName: string;
        invoiceId: string;
        outstandingAmount: number;
        originalAmount: number;
        strategy: string;
        createdBy: string;
    }): Promise<CollectionCase> => {
        const { data } = await api.post<ApiResponse<CollectionCase>>('/api/v1/collections/cases', collection);
        return data.data;
    },

    // Convert dispute to collection
    convertFromDispute: async (disputeId: string, tenantId: string, createdBy: string): Promise<CollectionCase> => {
        const { data } = await api.post<ApiResponse<CollectionCase>>('/api/v1/collections/convert-from-dispute', {
            disputeId,
            tenantId,
            createdBy,
        });
        return data.data;
    },

    // Record payment
    recordPayment: async (id: string, payment: {
        tenantId: string;
        amount: number;
        paymentMethod: string;
        recordedBy: string;
    }): Promise<CollectionCase> => {
        const { data } = await api.post<ApiResponse<CollectionCase>>(
            `/api/v1/collections/cases/${id}/payment`,
            payment
        );
        return data.data;
    },

    // Propose settlement
    proposeSettlement: async (id: string, settlement: {
        tenantId: string;
        proposedAmount: number;
        terms: string;
        proposedBy: string;
    }): Promise<CollectionCase> => {
        const { data } = await api.post<ApiResponse<CollectionCase>>(
            `/api/v1/collections/cases/${id}/settlement`,
            settlement
        );
        return data.data;
    },

    // Accept settlement
    acceptSettlement: async (id: string, tenantId: string, agreedAmount: number, acceptedBy: string): Promise<CollectionCase> => {
        const { data } = await api.put<ApiResponse<CollectionCase>>(
            `/api/v1/collections/cases/${id}/settlement/accept`,
            { tenantId, agreedAmount, acceptedBy }
        );
        return data.data;
    },

    // Write off
    writeOff: async (id: string, tenantId: string, reason: string, writtenOffBy: string): Promise<CollectionCase> => {
        const { data } = await api.post<ApiResponse<CollectionCase>>(
            `/api/v1/collections/cases/${id}/write-off`,
            { tenantId, reason, writtenOffBy }
        );
        return data.data;
    },

    // Get statistics
    getStatistics: async (tenantId: string): Promise<any> => {
        const { data } = await api.get(`/api/v1/collections/stats/${tenantId}`);
        return data.data;
    },
};

export default collectionApi;

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../config/api';

// Generic API hooks factory
export function useApiQuery<T>(key: string[], fetcher: () => Promise<T>) {
    return useQuery({
        queryKey: key,
        queryFn: fetcher,
    });
}

export function useApiMutation<TData, TVariables>(
    mutationFn: (variables: TVariables) => Promise<TData>,
    options?: {
        onSuccess?: (data: TData) => void;
        onError?: (error: Error) => void;
        invalidateKeys?: string[][];
    }
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn,
        onSuccess: (data) => {
            options?.onSuccess?.(data);
            options?.invalidateKeys?.forEach((key) => {
                queryClient.invalidateQueries({ queryKey: key });
            });
        },
        onError: options?.onError,
    });
}

// Specific API hooks
export const useInvoices = (tenantId: string) => {
    return useQuery({
        queryKey: ['invoices', tenantId],
        queryFn: async () => {
            const response = await apiClient.get(`/api/tenant/${tenantId}/invoices`);
            return response.data;
        },
        enabled: !!tenantId,
    });
};

export const usePayments = (tenantId: string) => {
    return useQuery({
        queryKey: ['payments', tenantId],
        queryFn: async () => {
            const response = await apiClient.get(`/api/tenant/${tenantId}/payments`);
            return response.data;
        },
        enabled: !!tenantId,
    });
};

export const useAnalytics = (tenantId: string) => {
    return useQuery({
        queryKey: ['analytics', tenantId],
        queryFn: async () => {
            const response = await apiClient.get(`/api/analytics/dashboard`);
            return response.data;
        },
        enabled: !!tenantId,
    });
};

export const useCreditScore = (tenantId: string) => {
    return useQuery({
        queryKey: ['creditScore', tenantId],
        queryFn: async () => {
            const response = await apiClient.get(`/api/tenant/${tenantId}/credit-scoring/self/score`);
            return response.data;
        },
        enabled: !!tenantId,
    });
};

export const useFinancingOffers = (tenantId: string) => {
    return useQuery({
        queryKey: ['financingOffers', tenantId],
        queryFn: async () => {
            const response = await apiClient.get(`/api/tenant/${tenantId}/financing/offers`);
            return response.data;
        },
        enabled: !!tenantId,
    });
};

export const useDisputes = (tenantId: string) => {
    return useQuery({
        queryKey: ['disputes', tenantId],
        queryFn: async () => {
            const response = await apiClient.get(`/api/v1/disputes/cases`, { params: { tenantId } });
            return response.data;
        },
        enabled: !!tenantId,
    });
};

export const useCampaigns = (tenantId: string) => {
    return useQuery({
        queryKey: ['campaigns', tenantId],
        queryFn: async () => {
            const response = await apiClient.get(`/api/tenant/${tenantId}/campaigns`);
            return response.data;
        },
        enabled: !!tenantId,
    });
};

export const useNotifications = (tenantId: string) => {
    return useQuery({
        queryKey: ['notifications', tenantId],
        queryFn: async () => {
            // Mock endpoint - replace with actual when backend is ready
            return {
                notifications: [],
                stats: { total: 0, sent: 0, pending: 0, failed: 0, deliveryRate: 0 }
            };
        },
        enabled: !!tenantId,
    });
};

export const useUsers = (tenantId: string) => {
    return useQuery({
        queryKey: ['users', tenantId],
        queryFn: async () => {
            const response = await apiClient.get(`/api/admin/users`, { params: { tenantId } });
            return response.data;
        },
        enabled: !!tenantId,
    });
};

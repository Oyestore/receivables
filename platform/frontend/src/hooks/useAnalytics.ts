import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '../config/api';

/**
 * Hook for fetching analytics dashboard data
 */
export const useAnalytics = (tenantId: string) => {
    return useQuery({
        queryKey: ['analytics', 'dashboard', tenantId],
        queryFn: async () => {
            const response = await analyticsAPI.getDashboard(tenantId);
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

/**
 * Hook for revenue trend
 */
export const useRevenueTrend = (tenantId: string) => {
    return useQuery({
        queryKey: ['analytics', 'revenue', tenantId],
        queryFn: async () => {
            const response = await analyticsAPI.getRevenueTrend(tenantId);
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
    });
};

// Legacy Hooks (Placeholders to prevent build errors in old components)
export interface DateRange {
    startDate: Date;
    endDate: Date;
}

export const useDistributionMetrics = (tenantId: string, dateRange: DateRange) => {
    return useQuery({
        queryKey: ['analytics', 'distribution', tenantId],
        queryFn: async () => ({}),
        enabled: false
    });
};

export const useEngagementMetrics = (tenantId: string, dateRange: DateRange) => {
    return useQuery({
        queryKey: ['analytics', 'engagement', tenantId],
        queryFn: async () => ({}),
        enabled: false
    });
};

export const useChannelPerformance = (tenantId: string, dateRange: DateRange) => {
    return useQuery({
        queryKey: ['analytics', 'channels', tenantId],
        queryFn: async () => ({}),
        enabled: false
    });
};

export const useMLPerformance = (tenantId: string, dateRange: DateRange) => {
    return useQuery({
        queryKey: ['analytics', 'ml-performance', tenantId],
        queryFn: async () => ({}),
        enabled: false
    });
};

export const useRealTimeStats = (tenantId: string, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['analytics', 'real-time', tenantId],
        queryFn: async () => ({}),
        enabled: false
    });
};

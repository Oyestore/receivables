import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerSuccessApi } from '@/lib/api';

/**
 * React Query Hooks for Customer Success Features
 */

// Customer Health
export function useCustomerHealth(customerId: string) {
    return useQuery({
        queryKey: ['customerHealth', customerId],
        queryFn: () => customerSuccessApi.getHealthMetrics(customerId),
        enabled: !!customerId,
        refetchInterval: 30000, // Refresh every 30 seconds
    });
}

export function useAtRiskCustomers(tenantId: string) {
    return useQuery({
        queryKey: ['atRiskCustomers', tenantId],
        queryFn: () => customerSuccessApi.getAtRiskCustomers(tenantId),
        enabled: !!tenantId,
        refetchInterval: 60000, // Refresh every minute
    });
}

export function usePortfolioHealthSummary(tenantId: string) {
    return useQuery({
        queryKey: ['portfolioHealthSummary', tenantId],
        queryFn: () => customerSuccessApi.getPortfolioHealthSummary(tenantId),
        enabled: !!tenantId,
        refetchInterval: 300000,
    });
}

// Churn Prediction & Intervention
export function useChurnPrediction(customerId: string) {
    return useQuery({
        queryKey: ['churnPrediction', customerId],
        queryFn: () => customerSuccessApi.getChurnPrediction(customerId),
        enabled: !!customerId,
    });
}

export function useExecutePlaybook() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            playbookId,
            customerId,
        }: {
            playbookId: string;
            customerId: string;
        }) => customerSuccessApi.executePlaybook(playbookId, customerId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['atRiskCustomers'] });
            queryClient.invalidateQueries({ queryKey: ['churnPrediction'] });
        },
    });
}

// Playbooks
export function usePlaybooks(tenantId: string) {
    return useQuery({
        queryKey: ['playbooks', tenantId],
        queryFn: () => customerSuccessApi.getPlaybooks(tenantId),
        enabled: !!tenantId,
    });
}

export function useCreatePlaybook() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (playbookData: any) => customerSuccessApi.createPlaybook(playbookData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['playbooks'] });
        },
    });
}

// Usage Analytics
export function useUsageAnalytics(customerId: string) {
    return useQuery({
        queryKey: ['usageAnalytics', customerId],
        queryFn: () => customerSuccessApi.getUsageAnalytics(customerId),
        enabled: !!customerId,
    });
}

export function useEngagementScore(customerId: string) {
    return useQuery({
        queryKey: ['engagementScore', customerId],
        queryFn: () => customerSuccessApi.getEngagementScore(customerId),
        enabled: !!customerId,
    });
}

// NPS & Feedback
export function useNPSMetrics(tenantId: string, period: string = 'month') {
    return useQuery({
        queryKey: ['npsMetrics', tenantId, period],
        queryFn: () => customerSuccessApi.getNPSMetrics(tenantId, period),
        enabled: !!tenantId,
    });
}

export function useFeedback(tenantId: string) {
    return useQuery({
        queryKey: ['feedback', tenantId],
        queryFn: () => customerSuccessApi.getFeedback(tenantId),
        enabled: !!tenantId,
    });
}

export function useRespondToFeedback() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            feedbackId,
            response,
        }: {
            feedbackId: string;
            response: string;
        }) => customerSuccessApi.respondToFeedback(feedbackId, response),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feedback'] });
        },
    });
}

// Expansion Opportunities
export function useExpansionOpportunities(tenantId: string) {
    return useQuery({
        queryKey: ['expansionOpportunities', tenantId],
        queryFn: () => customerSuccessApi.getExpansionOpportunities(tenantId),
        enabled: !!tenantId,
    });
}

export function useIdentifyOpportunities() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (tenantId: string) =>
            customerSuccessApi.identifyOpportunities(tenantId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expansionOpportunities'] });
        },
    });
}

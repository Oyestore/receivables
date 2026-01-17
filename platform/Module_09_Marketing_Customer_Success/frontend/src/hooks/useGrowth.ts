import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { growthApi } from '@/lib/api';

/**
 * React Query Hooks for Growth Features
 */

// Viral Opportunities
export function useViralOpportunities(userId: string) {
    return useQuery({
        queryKey: ['viralOpportunities', userId],
        queryFn: () => growthApi.getViralOpportunities(userId),
        enabled: !!userId,
        refetchInterval: 120000, // Refresh every 2 minutes
    });
}

// Network Intelligence
export function useNetworkBenchmarks(tenantId: string, industry: string) {
    return useQuery({
        queryKey: ['networkBenchmarks', tenantId, industry],
        queryFn: () => growthApi.getBenchmarks(tenantId, industry),
        enabled: !!tenantId && !!industry,
        staleTime: 300000, // 5 minutes
    });
}

export function useNetworkInsights(tenantId: string) {
    return useQuery({
        queryKey: ['networkInsights', tenantId],
        queryFn: () => growthApi.getInsights(tenantId),
        enabled: !!tenantId,
    });
}

// Referral Program
export function useReferralStats(userId: string) {
    return useQuery({
        queryKey: ['referralStats', userId],
        queryFn: () => growthApi.getReferralStats(userId),
        enabled: !!userId,
        refetchInterval: 60000, // Refresh every minute
    });
}

export function useReferralLeaderboard() {
    return useQuery({
        queryKey: ['referralLeaderboard'],
        queryFn: () => growthApi.getReferralLeaderboard(),
        staleTime: 120000, // 2 minutes
    });
}

export function useSendReferral() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (referralData: {
            userId: string;
            recipientEmail: string;
            message?: string;
        }) => growthApi.sendReferral(referralData),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['referralStats', variables.userId] });
        },
    });
}

// Community
export function useCommunityPosts(params?: { category?: string; limit?: number }) {
    return useQuery({
        queryKey: ['communityPosts', params],
        queryFn: () => growthApi.getCommunityPosts(params),
        staleTime: 60000, // 1 minute
    });
}

export function useTrendingTopics() {
    return useQuery({
        queryKey: ['trendingTopics'],
        queryFn: () => growthApi.getTrendingTopics(),
        staleTime: 300000, // 5 minutes
    });
}

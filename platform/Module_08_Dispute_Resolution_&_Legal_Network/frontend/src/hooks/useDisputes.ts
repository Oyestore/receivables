import { useQuery } from '@tanstack/react-query';
import disputeApi from '../services/disputeApi';

export function useDisputes(filters?: {
    status?: string;
    priority?: string;
    customerId?: string;
}) {
    return useQuery({
        queryKey: ['disputes', filters],
        queryFn: () => disputeApi.getAll(filters),
        staleTime: 30000, // 30 seconds
    });
}

export function useDispute(id: string | undefined) {
    return useQuery({
        queryKey: ['dispute', id],
        queryFn: () => disputeApi.getById(id!),
        enabled: !!id,
    });
}

export function useDisputePrediction(id: string | undefined, tenantId: string) {
    return useQuery({
        queryKey: ['prediction', id],
        queryFn: () => disputeApi.getPrediction(id!, tenantId),
        enabled: !!id,
        staleTime: 60000, // 1 minute - predictions don't change often
    });
}

export function useDisputeRisk(id: string | undefined, tenantId: string) {
    return useQuery({
        queryKey: ['risk', id],
        queryFn: () => disputeApi.getRiskAssessment(id!, tenantId),
        enabled: !!id,
        staleTime: 60000,
    });
}

export function useDisputeStats(tenantId: string) {
    return useQuery({
        queryKey: ['dispute-stats', tenantId],
        queryFn: () => disputeApi.getStatistics(tenantId),
        staleTime: 120000, // 2 minutes
    });
}

import { useQuery } from '@tanstack/react-query';
import collectionApi from '../services/collectionApi';

export function useCollections(filters?: {
    status?: string;
    assignedTo?: string;
}) {
    return useQuery({
        queryKey: ['collections', filters],
        queryFn: () => collectionApi.getAll(filters),
        staleTime: 30000,
    });
}

export function useCollection(id: string | undefined, tenantId: string) {
    return useQuery({
        queryKey: ['collection', id],
        queryFn: () => collectionApi.getById(id!, tenantId),
        enabled: !!id,
    });
}

export function useCollectionStats(tenantId: string) {
    return useQuery({
        queryKey: ['collection-stats', tenantId],
        queryFn: () => collectionApi.getStatistics(tenantId),
        staleTime: 120000,
    });
}

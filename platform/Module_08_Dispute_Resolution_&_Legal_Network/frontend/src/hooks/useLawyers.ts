import { useQuery } from '@tanstack/react-query';
import legalApi from '../services/legalApi';

export function useLawyers(filters?: {
    specialization?: string;
    status?: string;
    city?: string;
}) {
    return useQuery({
        queryKey: ['lawyers', filters],
        queryFn: () => legalApi.getAll(filters),
        staleTime: 300000, // 5 minutes - lawyer data doesn't change often
    });
}

export function useLawyer(id: string | undefined) {
    return useQuery({
        queryKey: ['lawyer', id],
        queryFn: () => legalApi.getById(id!),
        enabled: !!id,
        staleTime: 300000,
    });
}

export function useTopLawyers(limit: number = 10) {
    return useQuery({
        queryKey: ['top-lawyers', limit],
        queryFn: () => legalApi.getTopLawyers(limit),
        staleTime: 600000, // 10 minutes
    });
}

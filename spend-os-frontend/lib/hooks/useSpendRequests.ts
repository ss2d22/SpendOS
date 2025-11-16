'use client';

import { useQuery } from '@tanstack/react-query';
import { getSpendRequests, getAccountSpendRequests, getSpendRequest, type SpendRequestFilters } from '@/lib/api/spends';
import { REFETCH_INTERVALS } from '@/lib/config/constants';

/**
 * Hook to get all spend requests with optional filters
 */
export function useSpendRequests(filters?: SpendRequestFilters) {
  return useQuery({
    queryKey: ['spend-requests', filters],
    queryFn: () => getSpendRequests(filters),
    refetchInterval: REFETCH_INTERVALS.SPEND_REQUESTS,
  });
}

/**
 * Hook to get spend requests for a specific account
 */
export function useAccountSpendRequests(accountId: number | null) {
  return useQuery({
    queryKey: ['account-spend-requests', accountId],
    queryFn: () => getAccountSpendRequests(accountId!),
    enabled: accountId !== null,
    refetchInterval: REFETCH_INTERVALS.SPEND_REQUESTS,
  });
}

/**
 * Hook to get spend request detail
 */
export function useSpendRequest(spendId: number | null) {
  return useQuery({
    queryKey: ['spend-request', spendId],
    queryFn: () => getSpendRequest(spendId!),
    enabled: spendId !== null,
    refetchInterval: REFETCH_INTERVALS.SPEND_REQUESTS,
  });
}

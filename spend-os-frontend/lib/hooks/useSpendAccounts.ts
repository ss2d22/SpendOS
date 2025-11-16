'use client';

import { useQuery } from '@tanstack/react-query';
import { getSpendAccounts, getMySpendAccounts } from '@/lib/api/accounts';
import { REFETCH_INTERVALS } from '@/lib/config/constants';

/**
 * Hook to get all spend accounts (admin only)
 */
export function useSpendAccounts() {
  return useQuery({
    queryKey: ['spend-accounts'],
    queryFn: getSpendAccounts,
    refetchInterval: REFETCH_INTERVALS.ACCOUNTS,
  });
}

/**
 * Hook to get user's own spend accounts (spender/manager)
 */
export function useMySpendAccounts() {
  return useQuery({
    queryKey: ['my-spend-accounts'],
    queryFn: getMySpendAccounts,
    refetchInterval: REFETCH_INTERVALS.ACCOUNTS,
  });
}

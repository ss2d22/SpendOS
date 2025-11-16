'use client';

import { useQuery } from '@tanstack/react-query';
import { getSpendAccount } from '@/lib/api/accounts';
import { REFETCH_INTERVALS } from '@/lib/config/constants';

export function useSpendAccount(accountId: number | null) {
  return useQuery({
    queryKey: ['spend-account', accountId],
    queryFn: () => getSpendAccount(accountId!),
    enabled: accountId !== null,
    refetchInterval: REFETCH_INTERVALS.ACCOUNTS,
  });
}

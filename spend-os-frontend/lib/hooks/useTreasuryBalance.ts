'use client';

import { useQuery } from '@tanstack/react-query';
import { getTreasuryBalance } from '@/lib/api/treasury';
import { REFETCH_INTERVALS } from '@/lib/config/constants';

export function useTreasuryBalance() {
  return useQuery({
    queryKey: ['treasury-balance'],
    queryFn: getTreasuryBalance,
    refetchInterval: REFETCH_INTERVALS.TREASURY_BALANCE,
  });
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { getFundingHistory } from '@/lib/api/treasury';

export function useFundingHistory() {
  return useQuery({
    queryKey: ['funding-history'],
    queryFn: getFundingHistory,
  });
}

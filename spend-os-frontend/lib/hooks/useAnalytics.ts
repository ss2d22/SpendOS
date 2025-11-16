'use client';

import { useQuery } from '@tanstack/react-query';
import { getRunway, getBurnRate, getDepartmentBreakdown } from '@/lib/api/analytics';

/**
 * Hook to get runway analytics
 */
export function useRunway() {
  return useQuery({
    queryKey: ['runway'],
    queryFn: getRunway,
  });
}

/**
 * Hook to get burn rate analytics
 */
export function useBurnRate(days: number = 30) {
  return useQuery({
    queryKey: ['burn-rate', days],
    queryFn: () => getBurnRate(days),
  });
}

/**
 * Hook to get department breakdown analytics
 */
export function useDepartmentBreakdown() {
  return useQuery({
    queryKey: ['department-breakdown'],
    queryFn: getDepartmentBreakdown,
  });
}

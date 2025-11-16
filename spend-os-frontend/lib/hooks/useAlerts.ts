'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAlerts, acknowledgeAlert } from '@/lib/api/alerts';
import { REFETCH_INTERVALS } from '@/lib/config/constants';
import { toast } from 'sonner';

/**
 * Hook to get all active alerts
 */
export function useAlerts(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: getAlerts,
    refetchInterval: REFETCH_INTERVALS.ALERTS,
    enabled: options?.enabled ?? true,
    retry: false, // Don't retry on 403 errors
  });
}

/**
 * Hook to acknowledge an alert
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert acknowledged');
    },
    onError: () => {
      toast.error('Failed to acknowledge alert');
    },
  });
}

import { api } from './client';
import type { AlertsResponse } from '@/types/api';

/**
 * Get all active alerts
 */
export async function getAlerts(): Promise<AlertsResponse> {
  return api.get<AlertsResponse>('/alerts');
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string): Promise<void> {
  return api.patch<void>(`/alerts/${alertId}`);
}

import { api } from './client';
import type { RunwayResponse, BurnRateResponse, DepartmentBreakdown } from '@/types/api';

/**
 * Get runway analytics
 */
export async function getRunway(): Promise<RunwayResponse> {
  return api.get<RunwayResponse>('/analytics/runway');
}

/**
 * Get burn rate analytics
 */
export async function getBurnRate(days: number = 30): Promise<BurnRateResponse> {
  return api.get<BurnRateResponse>(`/analytics/burn-rate?days=${days}`);
}

/**
 * Get department spending breakdown
 */
export async function getDepartmentBreakdown(): Promise<DepartmentBreakdown[]> {
  return api.get<DepartmentBreakdown[]>('/analytics/department-breakdown');
}

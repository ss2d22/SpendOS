import { api } from './client';
import type {
  SpendRequestsResponse,
  SpendRequestDetailResponse,
  SpendStatus,
  CreateSpendRequestRequest,
  ApproveSpendRequestRequest,
  RejectSpendRequestRequest,
  SpendRequestTransactionResponse,
} from '@/types/api';

/**
 * Query parameters for spend requests
 */
export interface SpendRequestFilters {
  accountId?: number;
  status?: SpendStatus;
  spender?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get all spend requests with optional filters
 */
export async function getSpendRequests(filters?: SpendRequestFilters): Promise<SpendRequestsResponse> {
  const params = new URLSearchParams();

  if (filters?.accountId !== undefined) {
    params.append('accountId', filters.accountId.toString());
  }
  if (filters?.status) {
    params.append('status', filters.status);
  }
  if (filters?.spender) {
    params.append('spender', filters.spender);
  }
  if (filters?.limit !== undefined) {
    params.append('limit', filters.limit.toString());
  }
  if (filters?.offset !== undefined) {
    params.append('offset', filters.offset.toString());
  }

  const query = params.toString();
  return api.get<SpendRequestsResponse>(`/spend-requests${query ? `?${query}` : ''}`);
}

/**
 * Get spend requests for a specific account
 */
export async function getAccountSpendRequests(accountId: number): Promise<SpendRequestsResponse> {
  return getSpendRequests({ accountId });
}

/**
 * Get spend request detail by ID
 */
export async function getSpendRequest(requestId: number): Promise<SpendRequestDetailResponse> {
  return api.get<SpendRequestDetailResponse>(`/spend-requests/${requestId}`);
}

/**
 * Create a new spend request (Spender only)
 */
export async function createSpendRequest(
  data: CreateSpendRequestRequest
): Promise<SpendRequestTransactionResponse> {
  return api.post<SpendRequestTransactionResponse>('/spend-requests', data);
}

/**
 * Approve a spend request (Manager/Admin only)
 */
export async function approveSpendRequest(
  requestId: number,
  data?: ApproveSpendRequestRequest
): Promise<SpendRequestTransactionResponse> {
  return api.post<SpendRequestTransactionResponse>(`/spend-requests/${requestId}/approve`, data || {});
}

/**
 * Reject a spend request (Manager/Admin only)
 */
export async function rejectSpendRequest(
  requestId: number,
  data: RejectSpendRequestRequest
): Promise<SpendRequestTransactionResponse> {
  return api.post<SpendRequestTransactionResponse>(`/spend-requests/${requestId}/reject`, data);
}

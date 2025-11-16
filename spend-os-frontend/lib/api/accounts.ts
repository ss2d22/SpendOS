import { api } from './client';
import type {
  SpendAccountsResponse,
  SpendAccountDetailResponse,
  CreateSpendAccountRequest,
  UpdateSpendAccountRequest,
  UpdateAllowedChainsRequest,
  UpdateAutoTopupRequest,
  SpendAccountTransactionResponse,
  SpendAccount,
  SpendAccountDetails,
} from '@/types/api';

/**
 * Transform account data from backend format to frontend format
 * - Converts allowedChains from strings to numbers
 * - Computes status from frozen/closed booleans
 */
function transformAccount<T extends SpendAccount>(account: any): T {
  // Determine status from frozen and closed flags
  let status: 'Active' | 'Frozen' | 'Closed' = 'Active';
  if (account.closed) {
    status = 'Closed';
  } else if (account.frozen) {
    status = 'Frozen';
  }

  return {
    ...account,
    allowedChains: Array.isArray(account.allowedChains)
      ? account.allowedChains.map((chain: any) =>
          typeof chain === 'string' ? parseInt(chain, 10) : chain
        )
      : [],
    status,
  } as T;
}

/**
 * Get all spend accounts (admin only)
 */
export async function getSpendAccounts(): Promise<SpendAccountsResponse> {
  const accounts = await api.get<any[]>('/spend-accounts');
  return accounts.map(transformAccount);
}

/**
 * Get user's own spend accounts (spender/manager)
 */
export async function getMySpendAccounts(): Promise<SpendAccountsResponse> {
  const response = await api.get<{ owned: any[]; approver: any[] }>('/spend-accounts/mine');
  // Combine owned and approver accounts
  const allAccounts = [...(response.owned || []), ...(response.approver || [])];

  // Deduplicate by accountId (in case user is both owner and approver of the same account)
  const uniqueAccounts = Array.from(
    new Map(allAccounts.map(account => [account.accountId, account])).values()
  );

  return uniqueAccounts.map(transformAccount);
}

/**
 * Get spend account detail by ID
 */
export async function getSpendAccount(accountId: number): Promise<SpendAccountDetailResponse> {
  const account = await api.get<any>(`/spend-accounts/${accountId}`);
  return transformAccount<SpendAccountDetails>(account);
}

/**
 * Create a new spend account (Admin only)
 */
export async function createSpendAccount(
  data: CreateSpendAccountRequest
): Promise<SpendAccountTransactionResponse> {
  return api.post<SpendAccountTransactionResponse>('/spend-accounts', data);
}

/**
 * Update an existing spend account (Admin only)
 */
export async function updateSpendAccount(
  accountId: number,
  data: UpdateSpendAccountRequest
): Promise<SpendAccountTransactionResponse> {
  return api.patch<SpendAccountTransactionResponse>(`/spend-accounts/${accountId}`, data);
}

/**
 * Delete a spend account (Admin only)
 */
export async function deleteSpendAccount(accountId: number): Promise<SpendAccountTransactionResponse> {
  return api.delete<SpendAccountTransactionResponse>(`/spend-accounts/${accountId}`);
}

/**
 * Freeze a spend account (Admin only)
 */
export async function freezeSpendAccount(accountId: number): Promise<SpendAccountTransactionResponse> {
  return api.post<SpendAccountTransactionResponse>(`/spend-accounts/${accountId}/freeze`);
}

/**
 * Unfreeze a spend account (Admin only)
 */
export async function unfreezeSpendAccount(accountId: number): Promise<SpendAccountTransactionResponse> {
  return api.post<SpendAccountTransactionResponse>(`/spend-accounts/${accountId}/unfreeze`);
}

/**
 * Sweep remaining balance from a spend account (Admin only)
 */
export async function sweepSpendAccount(accountId: number): Promise<SpendAccountTransactionResponse> {
  return api.post<SpendAccountTransactionResponse>(`/spend-accounts/${accountId}/sweep`);
}

/**
 * Reset the spend period for an account (Admin only)
 */
export async function resetSpendPeriod(accountId: number): Promise<SpendAccountTransactionResponse> {
  return api.post<SpendAccountTransactionResponse>(`/spend-accounts/${accountId}/reset-period`);
}

/**
 * Update allowed chains for a spend account (Admin only)
 */
export async function updateAllowedChains(
  accountId: number,
  data: UpdateAllowedChainsRequest
): Promise<SpendAccountTransactionResponse> {
  return api.patch<SpendAccountTransactionResponse>(`/spend-accounts/${accountId}/allowed-chains`, data);
}

/**
 * Update auto top-up settings for a spend account (Admin only)
 */
export async function updateAutoTopup(
  accountId: number,
  data: UpdateAutoTopupRequest
): Promise<SpendAccountTransactionResponse> {
  return api.patch<SpendAccountTransactionResponse>(`/spend-accounts/${accountId}/auto-topup`, data);
}

/**
 * Execute auto top-up for a spend account (Admin only)
 */
export async function executeAutoTopup(accountId: number): Promise<SpendAccountTransactionResponse> {
  return api.post<SpendAccountTransactionResponse>(`/spend-accounts/${accountId}/execute-auto-topup`);
}

import { api } from './client';
import type {
  TreasuryBalanceResponse,
  FundingHistoryResponse,
  FundTreasuryRequest,
  TransferAdminRequest,
  TreasuryTransactionResponse,
} from '@/types/api';

/**
 * Get treasury balance
 */
export async function getTreasuryBalance(): Promise<TreasuryBalanceResponse> {
  return api.get<TreasuryBalanceResponse>('/treasury/balance');
}

/**
 * Get funding history
 */
export async function getFundingHistory(): Promise<FundingHistoryResponse> {
  return api.get<FundingHistoryResponse>('/treasury/funding-history');
}

/**
 * Fund the treasury (Admin only)
 */
export async function fundTreasury(data: FundTreasuryRequest): Promise<TreasuryTransactionResponse> {
  return api.post<TreasuryTransactionResponse>('/treasury/fund', data);
}

/**
 * Pause the treasury contract (Admin only)
 */
export async function pauseTreasury(): Promise<TreasuryTransactionResponse> {
  return api.post<TreasuryTransactionResponse>('/treasury/pause');
}

/**
 * Unpause the treasury contract (Admin only)
 */
export async function unpauseTreasury(): Promise<TreasuryTransactionResponse> {
  return api.post<TreasuryTransactionResponse>('/treasury/unpause');
}

/**
 * Transfer admin rights to new address (Admin only)
 */
export async function transferAdmin(data: TransferAdminRequest): Promise<TreasuryTransactionResponse> {
  return api.post<TreasuryTransactionResponse>('/treasury/transfer-admin', data);
}

export type Role = 'admin' | 'manager' | 'spender' | 'unknown';

export interface User {
  address: `0x${string}`;
  role: Role;
  roles: Role[];
  ownedAccountIds: number[];
  approverAccountIds: number[];
}

export interface PeriodDurationOption {
  label: string;
  value: 'weekly' | 'monthly' | 'custom';
  seconds: number;
}

export const PERIOD_DURATIONS: PeriodDurationOption[] = [
  { label: 'Weekly', value: 'weekly', seconds: 7 * 24 * 60 * 60 },
  { label: 'Monthly', value: 'monthly', seconds: 30 * 24 * 60 * 60 },
  { label: 'Custom', value: 'custom', seconds: 0 },
];

// Form data types
export interface CreateAccountFormData {
  label: string;
  owner: string;
  approver: string;
  budgetPerPeriod: string;
  periodDuration: 'weekly' | 'monthly' | 'custom';
  customPeriodSeconds?: string;
  perTxLimit: string;
  dailyLimit: string;
  approvalThreshold: string;
  allowedChains: number[];
}

// Update form only allows changing certain fields
export interface UpdateAccountFormData {
  label: string;
  budgetPerPeriod: string;
  periodDuration: 'weekly' | 'monthly' | 'custom';
  customPeriodSeconds?: string;
  perTxLimit: string;
  dailyLimit: string;
  approvalThreshold: string;
}

export interface SpendRequestFormData {
  accountId: number;
  amount: string;
  destinationChainId: number;
  destinationAddress: string;
  description: string;
}

export interface AutoTopupFormData {
  minBalance: string;
  targetBalance: string;
}

export interface ApproveSpendData {
  requestId: number;
}

export interface RejectSpendData {
  requestId: number;
  reason: string;
}

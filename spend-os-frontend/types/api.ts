// Auth types
export interface NonceRequest {
  address: string;
}

export interface NonceResponse {
  nonce: string;
}

export interface VerifySignatureRequest {
  address: string;
  message: string;
  signature: string;
}

export interface MeResponse {
  sub: string; // The wallet address (SIWE standard uses 'sub')
  roles: ('admin' | 'manager' | 'spender')[];
  ownedAccountIds: number[];
  approverAccountIds: number[];
}

// Treasury types
export interface TreasuryBalanceResponse {
  balance: string; // USDC dollars (e.g., "22.50")
  balanceFormatted: string; // Human-readable USDC dollars (e.g., "22.50")
  currency: string; // "USDC"
  unified: string; // Total unified balance across all chains from Circle Gateway in USDC dollars (e.g., "22.50")
  committed: string; // Total committed to active spend accounts in USDC dollars (e.g., "5.00")
  available: string; // Available balance after commitments in USDC dollars (e.g., "17.50")
  lastSyncAt: string; // Last balance sync timestamp (ISO 8601 string)
}

export interface FundingEvent {
  transactionHash: string;
  amount: string;
  depositor: string;
  timestamp: string;
}

export type FundingHistoryResponse = FundingEvent[];

export interface FundTreasuryRequest {
  amount: string;
  depositor: string;
}

export interface TransferAdminRequest {
  newAdmin: string;
}

export interface TreasuryTransactionResponse {
  transactionHash: string;
}

// Account types
export interface SpendAccount {
  accountId: number;
  owner: string;
  approver: string;
  label: string;
  budgetPerPeriod: string;
  periodDuration: number;
  perTxLimit: string;
  dailyLimit: string;
  approvalThreshold: string;
  allowedChains: number[];
  periodStart: number;
  periodSpent: string;
  periodReserved: string;
  dailySpent: string;
  dailyReserved: string;
  dailyResetTime: number;
  autoTopupEnabled: boolean;
  autoTopupMinBalance: string;
  autoTopupTargetBalance: string;
  status: 'Active' | 'Frozen' | 'Closed';
  createdAt: Date;
  updatedAt: Date;
}

export interface SpendAccountDetails extends SpendAccount {
  virtualBalance: string;
}

// API Response types for accounts
export type SpendAccountsResponse = SpendAccount[];
export type SpendAccountDetailResponse = SpendAccountDetails;

// Spend Account mutation types
export interface CreateSpendAccountRequest {
  owner: string;
  approver: string;
  label: string;
  budgetPerPeriod: string;
  periodDuration: number;
  perTxLimit: string;
  dailyLimit: string;
  approvalThreshold: string;
  allowedChains: number[];
  autoTopupEnabled?: boolean;
  autoTopupMinBalance?: string;
  autoTopupTargetBalance?: string;
}

export interface UpdateSpendAccountRequest {
  budgetPerPeriod?: string;
  perTxLimit?: string;
  dailyLimit?: string;
  approvalThreshold?: string;
}

export interface UpdateAllowedChainsRequest {
  allowedChains: number[];
}

export interface UpdateAutoTopupRequest {
  minBalance: string;
  targetBalance: string;
}

export interface SpendAccountTransactionResponse {
  transactionHash: string;
}

// Spend request types
export type SpendStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'EXECUTING'
  | 'EXECUTED'
  | 'REJECTED'
  | 'FAILED';

export interface SpendRequest {
  requestId: number;
  accountId: number;
  accountLabel?: string;
  amount: string;
  destinationChainId: number;
  destinationAddress: string;
  description: string;
  status: SpendStatus;
  requester: string;
  approver?: string;
  createdAt: Date;
  approvedAt?: Date;
  executedAt?: Date;
  rejectedAt?: Date;
  gatewayTxId?: string;
  transactionHash?: string;
  rejectReason?: string;
  failureReason?: string;
}

// API Response types for spend requests
export type SpendRequestsResponse = SpendRequest[];
export type SpendRequestDetailResponse = SpendRequest;

// Spend Request mutation types
export interface CreateSpendRequestRequest {
  accountId: number;
  amount: string;
  destinationChainId: number;
  destinationAddress: string;
  description: string;
}

export interface ApproveSpendRequestRequest {
  gatewayTxId?: string;
}

export interface RejectSpendRequestRequest {
  reason: string;
}

export interface SpendRequestTransactionResponse {
  transactionHash?: string;
  message?: string;
}

// Analytics types
export interface RunwayResponse {
  days: number; // Days until funds depleted (-1 for infinite)
  amount: string; // Available balance in USDC dollars (e.g., "1000.00")
}

export interface BurnRateResponse {
  period: number; // Days analyzed
  totalSpent: string; // Total spent in period (micro USDC, e.g., "150000000")
  dailyAverage: string; // Average daily spend (micro USDC, e.g., "5000000")
  weeklyAverage: string; // Average weekly spend (micro USDC, e.g., "35000000")
  monthlyAverage: string; // Average monthly spend (micro USDC, e.g., "150000000")
}

export interface DepartmentBreakdown {
  department: string;
  accountId: number;
  totalSpent: string;
  percentage: number;
}

// API Response types for alerts
export type AlertsResponse = Alert[];

// Alerts types
export type AlertType =
  | 'BUDGET_THRESHOLD'
  | 'HIGH_RESERVATION'
  | 'PERIOD_ENDING'
  | 'ACCOUNT_FROZEN'
  | 'ACCOUNT_CLOSED'
  | 'SPEND_FAILED'
  | 'ADMIN_TRANSFERRED'
  | 'CONTRACT_PAUSED'
  | 'CONTRACT_UNPAUSED'
  | 'LOW_TREASURY_BALANCE';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  acknowledged: boolean;
  createdAt: string;
  acknowledgedAt?: string | null;
}

// Health types
export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  database?: 'ok' | 'error';
  redis?: 'ok' | 'error';
  blockchain?: 'ok' | 'error';
}

// Query params
export interface SpendRequestFilters {
  accountId?: number;
  status?: SpendStatus;
  limit?: number;
  approverAddress?: string;
}

export interface AlertFilters {
  type?: AlertType;
  severity?: AlertSeverity;
  acknowledged?: boolean;
  limit?: number;
}

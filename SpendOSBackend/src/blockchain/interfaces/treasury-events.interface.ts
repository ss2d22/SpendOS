export interface SpendRequestedEvent {
  requestId: number;
  accountId: number;
  requesterAddress: string;
  amount: string;
  chainId: number;
  destinationAddress: string;
  description: string;
  blockNumber: number;
  txHash: string;
  timestamp: Date;
}

export interface SpendApprovedEvent {
  requestId: number;
  accountId: number;
  approverAddress: string;
  amount: string;
  blockNumber: number;
  txHash: string;
  timestamp: Date;
}

export interface SpendRejectedEvent {
  requestId: number;
  accountId: number;
  approverAddress: string;
  reason: string;
  blockNumber: number;
  txHash: string;
  timestamp: Date;
}

export interface SpendExecutedEvent {
  requestId: number;
  accountId: number;
  amount: string;
  gatewayTxId: string;
  blockNumber: number;
  txHash: string;
  timestamp: Date;
}

export interface SpendFailedEvent {
  requestId: number;
  accountId: number;
  reason: string;
  blockNumber: number;
  txHash: string;
  timestamp: Date;
}

export interface SpendAccountCreatedEvent {
  accountId: number;
  ownerAddress: string;
  approverAddress: string;
  label: string;
  budgetPerPeriod: string;
  periodDuration: number;
  perTxLimit: string;
  dailyLimit: string;
  approvalThreshold: string;
  allowedChains: number[];
  blockNumber: number;
  txHash: string;
  timestamp: Date;
}

export interface SpendAccountUpdatedEvent {
  accountId: number;
  blockNumber: number;
  txHash: string;
  timestamp: Date;
}

export interface SpendAccountFrozenEvent {
  accountId: number;
  blockNumber: number;
  txHash: string;
  timestamp: Date;
}

export interface SpendAccountUnfrozenEvent {
  accountId: number;
  blockNumber: number;
  txHash: string;
  timestamp: Date;
}

export interface SpendAccountClosedEvent {
  accountId: number;
  blockNumber: number;
  txHash: string;
  timestamp: Date;
}

export interface InboundFundingEvent {
  amount: string;
  gatewayTxId: string;
  blockNumber: number;
  txHash: string;
  timestamp: Date;
}

export interface AdminTransferredEvent {
  previousAdmin: string;
  newAdmin: string;
  blockNumber: number;
  txHash: string;
  timestamp: Date;
}

export interface ContractPausedEvent {
  blockNumber: number;
  txHash: string;
  timestamp: Date;
}

export interface ContractUnpausedEvent {
  blockNumber: number;
  txHash: string;
  timestamp: Date;
}

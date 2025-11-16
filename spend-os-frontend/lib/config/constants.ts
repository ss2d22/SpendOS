export const TREASURY_ADDRESS = (process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '0x') as `0x${string}`;

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'ArcSpendOS';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const USDC_DECIMALS = 6;

// Supported chains - Gateway supported chains only
// These match the chain IDs defined in the Treasury smart contract
export const MAINNET_CHAINS = [
  { id: 1, name: 'Ethereum' },
  { id: 137, name: 'Polygon' },
  { id: 43114, name: 'Avalanche' },
  { id: 42161, name: 'Arbitrum' },
  { id: 10, name: 'Optimism' },
  { id: 8453, name: 'Base' },
  { id: 999, name: 'HyperEVM' },
  { id: 1329, name: 'Sei' },
  { id: 146, name: 'Sonic' },
  { id: 130, name: 'Unichain' },
  { id: 480, name: 'World Chain' },
] as const;

export const TESTNET_CHAINS = [
  { id: 11155111, name: 'Ethereum Sepolia' },
  { id: 43113, name: 'Avalanche Fuji' },
  { id: 84532, name: 'Base Sepolia' },
  { id: 5042002, name: 'Arc Testnet' },
  { id: 998, name: 'HyperEVM Testnet' },
  { id: 1328, name: 'Sei Atlantic' },
  { id: 57054, name: 'Sonic Testnet' },
  { id: 4801, name: 'World Chain Sepolia' },
] as const;

// All supported chains (for backwards compatibility)
export const SUPPORTED_CHAINS = [...MAINNET_CHAINS, ...TESTNET_CHAINS] as const;

// Testnet chain IDs for easy lookup
export const TESTNET_CHAIN_IDS: Set<number> = new Set(TESTNET_CHAINS.map(chain => chain.id));

// Refetch intervals in milliseconds
export const REFETCH_INTERVALS = {
  TREASURY_BALANCE: 30000, // 30 seconds
  ALERTS: 15000, // 15 seconds
  SPEND_REQUESTS: 10000, // 10 seconds
  ACCOUNTS: 30000, // 30 seconds
} as const;

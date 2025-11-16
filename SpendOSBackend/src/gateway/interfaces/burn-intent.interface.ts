/**
 * Transfer specification describing the desired cross-chain transfer
 * This matches Circle Gateway's expected format
 */
export interface TransferSpec {
  version: number;
  sourceDomain: number;
  destinationDomain: number;
  sourceContract: string; // Will be converted to bytes32
  destinationContract: string; // Will be converted to bytes32
  sourceToken: string; // Will be converted to bytes32
  destinationToken: string; // Will be converted to bytes32
  sourceDepositor: string; // Will be converted to bytes32
  destinationRecipient: string; // Will be converted to bytes32
  sourceSigner: string; // Will be converted to bytes32
  destinationCaller: string; // Will be converted to bytes32
  value: string; // BigInt as string
  salt: string; // Random 32-byte hex string
  hookData: string; // Hex string, usually '0x'
}

/**
 * Burn intent with Circle Gateway format
 */
export interface BurnIntent {
  maxBlockHeight: string; // BigInt as string
  maxFee: string; // BigInt as string (minimum 2.01 USDC = 2010000)
  spec: TransferSpec;
}

/**
 * Signed burn intent for Gateway API submission
 */
export interface SignedBurnIntent {
  burnIntent: BurnIntent;
  signature: string;
}

/**
 * Gateway API transfer response
 */
export interface GatewayTransferResponse {
  attestation: string;
  signature: string;
}

/**
 * Chain domain mapping for Circle Gateway
 */
export const CHAIN_DOMAINS: Record<number, number> = {
  5042002: 26, // Arc Testnet
  84532: 6, // Base Sepolia
  11155111: 0, // Ethereum Sepolia
  43113: 1, // Avalanche Fuji
};

/**
 * Gateway contract addresses by chain ID
 */
export const GATEWAY_CONTRACTS: Record<
  number,
  { wallet: string; minter: string; usdc: string }
> = {
  5042002: {
    // Arc Testnet
    wallet: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
    minter: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B',
    usdc: '0x3600000000000000000000000000000000000000',
  },
  84532: {
    // Base Sepolia
    wallet: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
    minter: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
  11155111: {
    // Ethereum Sepolia
    wallet: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
    minter: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B',
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  },
  43113: {
    // Avalanche Fuji
    wallet: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
    minter: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B',
    usdc: '0x5425890298aed601595a70AB815c96711a31Bc65',
  },
};

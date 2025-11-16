import { defineChain } from 'viem';

export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: {
    name: 'tARC',
    symbol: 'tARC',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://arc-testnet-rpc.example.com'] },
    public: { http: [process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://arc-testnet-rpc.example.com'] },
  },
  blockExplorers: {
    default: {
      name: 'Arcscan',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
});

export const SUPPORTED_CHAINS = [
  { id: 5042002, name: 'Arc Testnet', shortName: 'Arc' },
  { id: 84532, name: 'Base Sepolia', shortName: 'Base' },
  { id: 11155111, name: 'Ethereum Sepolia', shortName: 'Sepolia' },
  { id: 43113, name: 'Avalanche Fuji', shortName: 'Fuji' },
] as const;

export function getChainName(chainId: number): string {
  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
  return chain?.name || `Chain ${chainId}`;
}

export function getChainShortName(chainId: number): string {
  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
  return chain?.shortName || `${chainId}`;
}

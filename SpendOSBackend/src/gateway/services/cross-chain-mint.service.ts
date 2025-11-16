import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';

// Gateway Minter ABI (gatewayMint function)
const GATEWAY_MINTER_ABI = [
  {
    inputs: [
      { internalType: 'bytes', name: 'attestationPayload', type: 'bytes' },
      { internalType: 'bytes', name: 'signature', type: 'bytes' },
    ],
    name: 'gatewayMint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

// Gateway Minter addresses on different chains
const GATEWAY_MINTER_ADDRESSES: Record<number, string> = {
  84532: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B', // Base Sepolia
  11155111: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B', // Ethereum Sepolia
  43113: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B', // Avalanche Fuji
};

// RPC URLs for destination chains
const CHAIN_RPC_URLS: Record<number, string> = {
  84532: 'https://sepolia.base.org',
  11155111: 'https://ethereum-sepolia-rpc.publicnode.com',
  43113: 'https://api.avax-test.network/ext/bc/C/rpc',
};

@Injectable()
export class CrossChainMintService {
  private readonly logger = new Logger(CrossChainMintService.name);
  private providers: Map<number, JsonRpcProvider> = new Map();
  private wallets: Map<number, Wallet> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.initializeProviders();
  }

  private initializeProviders() {
    const privateKey = this.configService.get<string>(
      'gateway.walletPrivateKey',
    ) as string;

    for (const [chainId, rpcUrl] of Object.entries(CHAIN_RPC_URLS)) {
      const provider = new JsonRpcProvider(rpcUrl);
      const wallet = new Wallet(privateKey, provider);

      this.providers.set(Number(chainId), provider);
      this.wallets.set(Number(chainId), wallet);

      this.logger.log(`Initialized provider for chain ${chainId}`);
    }
  }

  async mintOnDestination(
    chainId: number,
    attestation: string,
    signature: string,
  ): Promise<string> {
    try {
      this.logger.log(`Minting USDC on chain ${chainId}`);

      const minterAddress = GATEWAY_MINTER_ADDRESSES[chainId];
      if (!minterAddress) {
        throw new Error(
          `Gateway Minter address not found for chain ${chainId}`,
        );
      }

      const wallet = this.wallets.get(chainId);
      if (!wallet) {
        throw new Error(`Wallet not found for chain ${chainId}`);
      }

      const minterContract = new Contract(
        minterAddress,
        GATEWAY_MINTER_ABI,
        wallet,
      );

      // Call gatewayMint function with attestation and signature
      const tx = await minterContract.gatewayMint(attestation, signature);
      const receipt = await tx.wait();

      this.logger.log(
        `Mint successful on chain ${chainId}, tx: ${receipt.hash}`,
      );
      return receipt.hash;
    } catch (error) {
      this.logger.error(`Failed to mint on chain ${chainId}`, error);
      throw error;
    }
  }

  getProvider(chainId: number): JsonRpcProvider | undefined {
    return this.providers.get(chainId);
  }

  getWallet(chainId: number): Wallet | undefined {
    return this.wallets.get(chainId);
  }

  getSupportedChains(): number[] {
    return Array.from(this.providers.keys());
  }
}

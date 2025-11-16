import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Contract } from 'ethers';
import { firstValueFrom } from 'rxjs';
import {
  SignedBurnIntent,
  GatewayTransferResponse,
} from '../interfaces/burn-intent.interface';
import { ArcProviderService } from '../../blockchain/services/arc-provider.service';

/**
 * Gateway API Service
 *
 * Circle Gateway is a permissionless public API - no API keys needed.
 * Users sign burn intents with their own wallets (EIP-712).
 *
 * API Base URLs:
 * - Testnet: https://gateway-api-testnet.circle.com/v1
 * - Mainnet: https://gateway-api.circle.com/v1
 *
 * Gateway Wallet Contract Addresses:
 * - Arc Testnet: 0x0077777d7EBA4688BDeF3E311b846F25870A19B9
 * - USDC on Arc Testnet: 0x3600000000000000000000000000000000000000
 *
 * Domain Mappings (Testnet):
 * - Domain 0: Ethereum Sepolia
 * - Domain 1: Avalanche Fuji
 * - Domain 6: Base Sepolia
 * - Domain 26: Arc Testnet
 */
// Chain ID to Domain mapping for Gateway (Testnet)
const CHAIN_TO_DOMAIN: Record<number, number> = {
  5042002: 26, // Arc Testnet
  84532: 6, // Base Sepolia
  11155111: 0, // Ethereum Sepolia
  43113: 1, // Avalanche Fuji
};

// USDC token addresses per chain (Testnet)
const USDC_ADDRESSES: Record<number, string> = {
  5042002: '0x3600000000000000000000000000000000000000', // Arc Testnet
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
  11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Ethereum Sepolia
  43113: '0x5425890298aed601595a70AB815c96711a31Bc65', // Avalanche Fuji
};

@Injectable()
export class GatewayApiService implements OnModuleInit {
  private readonly logger = new Logger(GatewayApiService.name);
  private readonly apiBaseUrl: string;
  private readonly gatewayWalletAddress =
    '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';
  private readonly usdcAddress = '0x3600000000000000000000000000000000000000';
  private gatewayWalletContract: Contract;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly arcProviderService: ArcProviderService,
  ) {
    // Gateway is permissionless - using public testnet API
    this.apiBaseUrl =
      this.configService.get<string>('gateway.apiBaseUrl') ||
      'https://gateway-api-testnet.circle.com/v1';
  }

  async onModuleInit() {
    // Initialize Gateway Wallet contract for direct balance queries after providers are ready
    const provider = this.arcProviderService.getHttpProvider();
    const gatewayWalletAbi = [
      'function availableBalance(address token, address depositor) external view returns (uint256)',
      'function totalBalance(address token, address depositor) external view returns (uint256)',
      'function withdrawingBalance(address token, address depositor) external view returns (uint256)',
    ];
    this.gatewayWalletContract = new Contract(
      this.gatewayWalletAddress,
      gatewayWalletAbi,
      provider,
    );
    this.logger.log('Gateway Wallet contract initialized');
  }

  /**
   * Get unified USDC balance for an address across all supported chains
   * Uses Gateway API to query balances across multiple domains efficiently.
   * @param address - User's wallet address
   * @param chainIds - Optional array of chain IDs to query (defaults to all supported chains)
   */
  async getUnifiedBalance(
    address: string,
    chainIds?: number[],
  ): Promise<{
    totalBalance: string;
    totalBalanceUsdc: string;
    balances: Array<{
      chainId: number;
      domain: number;
      balance: string;
      balanceUsdc: string;
      token: string;
    }>;
    address: string;
  }> {
    try {
      // Use all supported chains if not specified
      const chains = chainIds || Object.keys(CHAIN_TO_DOMAIN).map(Number);

      this.logger.log(
        `Fetching unified USDC balance for ${address} across ${chains.length} chains`,
      );

      // Build sources array for Gateway API
      const sources = chains.map((chainId) => ({
        depositor: address,
        domain: CHAIN_TO_DOMAIN[chainId],
      }));

      // Query Gateway API for balances across all domains
      // Note: Gateway API expects "USDC" as the token identifier
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiBaseUrl}/balances`,
          {
            token: 'USDC',
            sources,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const balancesData = response.data;
      this.logger.debug('Gateway balances response:', balancesData);

      // Parse and format balances
      const balances = chains.map((chainId, index) => {
        const domain = CHAIN_TO_DOMAIN[chainId];
        const balanceData = balancesData.balances?.[index] || {
          balance: '0',
        };

        // Gateway API returns balance as decimal USDC (e.g., "22.497825")
        // We need to convert to micro USDC (integer with 6 decimals)
        const balanceDecimal = balanceData.balance || '0';
        const balanceNumber = parseFloat(balanceDecimal);
        const balanceMicroUsdc = Math.floor(balanceNumber * 1e6).toString();

        return {
          chainId,
          domain,
          balance: balanceMicroUsdc,
          balanceUsdc: balanceNumber.toFixed(6),
          token: USDC_ADDRESSES[chainId],
        };
      });

      // Calculate total balance across all chains
      const totalBalance = balances
        .reduce((sum, b) => sum + BigInt(b.balance), BigInt(0))
        .toString();
      const totalBalanceUsdc = (Number(totalBalance) / 1e6).toFixed(6);

      this.logger.log(
        `Unified balance: ${totalBalance} micro USDC (${totalBalanceUsdc} USDC)`,
      );

      return {
        totalBalance,
        totalBalanceUsdc,
        balances,
        address,
      };
    } catch (error) {
      this.logger.error('Failed to fetch unified balance', error);
      throw error;
    }
  }

  /**
   * Get balance on Arc Testnet only (Gateway Wallet contract query)
   * @param address - User's wallet address
   */
  async getArcBalance(address: string): Promise<any> {
    try {
      this.logger.log(
        `Fetching Arc Testnet balance for ${address} from Gateway Wallet contract`,
      );

      // Query Gateway Wallet contract directly on Arc Testnet
      const availableBalance =
        await this.gatewayWalletContract.availableBalance(
          this.usdcAddress,
          address,
        );

      const balance = availableBalance.toString();
      const balanceUsdc = (Number(balance) / 1e6).toFixed(6);

      this.logger.log(
        `Arc Gateway balance: ${balance} (${balanceUsdc} USDC)`,
      );

      return {
        balance,
        balanceUsdc,
        token: this.usdcAddress,
        chainId: 5042002,
        domain: 26,
        address,
      };
    } catch (error) {
      this.logger.error('Failed to fetch Arc balance', error);
      throw error;
    }
  }

  /**
   * Submit burn intent(s) to Gateway and receive attestation
   * @param signedBurnIntents - Array of signed burn intents
   */
  async submitBurnIntent(
    signedBurnIntents: SignedBurnIntent[],
  ): Promise<GatewayTransferResponse> {
    try {
      this.logger.log('Submitting burn intent(s) to Gateway');
      this.logger.debug('Burn intents:', signedBurnIntents);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiBaseUrl}/transfer`,
          signedBurnIntents,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Transfer response:`, response.data);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to submit burn intent', error);

      // Log detailed error response from Gateway API
      if (error.response) {
        this.logger.error('Gateway API error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        });
      }

      throw error;
    }
  }
}

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
 */
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
   * Get unified USDC balance for an address across all chains
   * Query the Gateway Wallet contract directly for balance.
   * @param token - Token symbol (e.g., 'USDC')
   * @param address - User's wallet address
   */
  async getUnifiedBalance(token: string, address: string): Promise<any> {
    try {
      this.logger.log(
        `Fetching ${token} balance for ${address} from Gateway Wallet contract`,
      );

      // Query Gateway Wallet contract directly
      const availableBalance =
        await this.gatewayWalletContract.availableBalance(
          this.usdcAddress,
          address,
        );

      const balance = availableBalance.toString();
      this.logger.log(
        `Gateway balance: ${balance} (${Number(balance) / 1e6} USDC)`,
      );

      return {
        balance,
        available: balance,
        token: this.usdcAddress,
        address,
      };
    } catch (error) {
      this.logger.error('Failed to fetch unified balance', error);
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

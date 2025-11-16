import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Wallet } from 'ethers';
import { GatewayApiService } from '../../gateway/services/gateway-api.service';
import { RedisService } from '../../redis/services/redis.service';
import { ArcProviderService } from '../../blockchain/services/arc-provider.service';

@Injectable()
export class BalanceSyncService {
  private readonly logger = new Logger(BalanceSyncService.name);
  private readonly BALANCE_KEY = 'treasury:unified_balance';
  private readonly LAST_SYNC_KEY = 'treasury:last_sync';
  private adminWallet: Wallet;

  constructor(
    private readonly gatewayApiService: GatewayApiService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly arcProviderService: ArcProviderService,
  ) {
    // Initialize admin wallet for balance queries
    const adminPrivateKey = this.configService.get<string>(
      'backend.adminPrivateKey',
    ) as string;
    const provider = this.arcProviderService.getHttpProvider();
    this.adminWallet = new Wallet(adminPrivateKey, provider);
    this.logger.log(
      `Balance sync initialized for admin wallet: ${this.adminWallet.address}`,
    );
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async syncBalance() {
    try {
      // Query admin wallet's Gateway balance (admin holds the USDC for spending)
      const walletAddress = this.adminWallet.address;

      // Get unified USDC balance from Gateway across all supported chains
      const balanceResponse = await this.gatewayApiService.getUnifiedBalance(
        walletAddress,
      );
      const balance = balanceResponse.totalBalance || '0';
      const timestamp = new Date().toISOString();

      await this.redisService.set(this.BALANCE_KEY, balance);
      await this.redisService.set(this.LAST_SYNC_KEY, timestamp);

      this.logger.debug(
        `Balance synced: ${balance} micro USDC (${balanceResponse.totalBalanceUsdc} USDC) at ${timestamp}`,
      );
    } catch (error) {
      this.logger.error('Failed to sync balance', error);
    }
  }

  async getCachedBalance(): Promise<{ balance: string; lastSyncAt: string }> {
    const balance = await this.redisService.get(this.BALANCE_KEY);
    const lastSyncAt = await this.redisService.get(this.LAST_SYNC_KEY);

    return {
      balance: balance || '0',
      lastSyncAt: lastSyncAt || new Date(0).toISOString(),
    };
  }
}

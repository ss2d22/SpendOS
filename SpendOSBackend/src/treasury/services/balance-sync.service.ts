import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GatewayApiService } from '../../gateway/services/gateway-api.service';
import { RedisService } from '../../redis/services/redis.service';
import { TreasuryContractService } from '../../blockchain/services/treasury-contract.service';

@Injectable()
export class BalanceSyncService {
  private readonly logger = new Logger(BalanceSyncService.name);
  private readonly BALANCE_KEY = 'treasury:unified_balance';
  private readonly LAST_SYNC_KEY = 'treasury:last_sync';

  constructor(
    private readonly gatewayApiService: GatewayApiService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly treasuryContractService: TreasuryContractService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async syncBalance() {
    try {
      // Get backend wallet address (same wallet used by treasury)
      const backendWallet = this.treasuryContractService.getBackendWallet();
      const walletAddress = backendWallet.address;

      // Get unified USDC balance from Gateway
      const balanceResponse = await this.gatewayApiService.getUnifiedBalance(
        'USDC',
        walletAddress,
      );
      const balance = balanceResponse.balance || '0';
      const timestamp = new Date().toISOString();

      await this.redisService.set(this.BALANCE_KEY, balance);
      await this.redisService.set(this.LAST_SYNC_KEY, timestamp);

      this.logger.debug(`Balance synced: ${balance} USDC at ${timestamp}`);
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

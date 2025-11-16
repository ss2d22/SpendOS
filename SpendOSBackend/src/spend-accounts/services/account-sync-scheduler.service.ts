import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SpendAccountsService } from './spend-accounts.service';

@Injectable()
export class AccountSyncSchedulerService {
  private readonly logger = new Logger(AccountSyncSchedulerService.name);
  private readonly enabled: boolean;

  constructor(
    private readonly spendAccountsService: SpendAccountsService,
    private readonly configService: ConfigService,
  ) {
    // Enable/disable sync via environment variable
    this.enabled =
      this.configService.get<string>('ENABLE_ACCOUNT_SYNC') === 'true';
    this.logger.log(
      `Account sync scheduler ${this.enabled ? 'enabled' : 'disabled'}`,
    );
  }

  // Run every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleAccountSync() {
    if (!this.enabled) {
      return;
    }

    this.logger.log('Starting scheduled account sync...');

    try {
      const result =
        await this.spendAccountsService.syncAllAccountsFromBlockchain();

      this.logger.log(
        `Scheduled sync complete: ${result.synced}/${result.total} accounts synced, ${result.failed} failed`,
      );

      if (result.failed > 0) {
        this.logger.warn(`${result.failed} accounts failed to sync`);
      }
    } catch (error) {
      this.logger.error('Scheduled account sync failed', error);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { SpendRequest } from '../../spend-requests/entities/spend-request.entity';
import { SpendStatus } from '../../common/enums';
import { SpendExecutorService } from '../../spend-requests/services/spend-executor.service';
import { TreasuryContractService } from '../../blockchain/services/treasury-contract.service';

@Injectable()
export class StuckSpendsProcessor {
  private readonly logger = new Logger(StuckSpendsProcessor.name);
  private readonly STUCK_THRESHOLD_MINUTES = 10;
  private readonly MAX_RETRIES = 3;

  constructor(
    @InjectRepository(SpendRequest)
    private readonly spendRequestRepository: Repository<SpendRequest>,
    private readonly spendExecutorService: SpendExecutorService,
    private readonly treasuryContractService: TreasuryContractService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleStuckSpends() {
    this.logger.log('Checking for stuck spends...');

    try {
      // Find spends that have been in EXECUTING status for too long
      const stuckThreshold = new Date();
      stuckThreshold.setMinutes(
        stuckThreshold.getMinutes() - this.STUCK_THRESHOLD_MINUTES,
      );

      const stuckSpends = await this.spendRequestRepository.find({
        where: {
          status: SpendStatus.EXECUTING,
          updatedAt: LessThan(stuckThreshold),
        },
      });

      if (stuckSpends.length === 0) {
        this.logger.log('No stuck spends found');
        return;
      }

      this.logger.log(
        `Found ${stuckSpends.length} stuck spends, attempting recovery...`,
      );

      for (const spend of stuckSpends) {
        await this.recoverStuckSpend(spend);
      }

      this.logger.log('Stuck spends recovery complete');
    } catch (error) {
      this.logger.error('Error processing stuck spends', error);
    }
  }

  private async recoverStuckSpend(spend: SpendRequest): Promise<void> {
    try {
      this.logger.log(`Attempting to recover stuck spend ${spend.requestId}`);

      // Check on-chain status first
      const onChainRequest = await this.treasuryContractService.getRequest(
        spend.requestId,
      );

      // If already executed on-chain, update our DB
      if (onChainRequest.executed) {
        this.logger.log(
          `Spend ${spend.requestId} is already executed on-chain, updating DB`,
        );
        await this.spendRequestRepository.update(
          { id: spend.id },
          {
            status: SpendStatus.EXECUTED,
            executedAt: new Date(),
          },
        );
        return;
      }

      // If failed on-chain, mark as failed
      if (onChainRequest.rejected) {
        this.logger.log(
          `Spend ${spend.requestId} was rejected on-chain, marking as failed`,
        );
        await this.spendRequestRepository.update(
          { id: spend.id },
          {
            status: SpendStatus.FAILED,
            failureReason: 'Rejected on-chain',
          },
        );
        return;
      }

      // Check if we've exceeded max retry attempts
      const timeSinceCreation = Date.now() - spend.createdAt.getTime();
      const hoursSinceCreation = timeSinceCreation / (1000 * 60 * 60);

      if (hoursSinceCreation > 24) {
        // If stuck for more than 24 hours, mark as failed
        this.logger.warn(
          `Spend ${spend.requestId} stuck for >24 hours, marking as failed`,
        );
        await this.spendRequestRepository.update(
          { id: spend.id },
          {
            status: SpendStatus.FAILED,
            failureReason: 'Execution timeout - stuck for over 24 hours',
          },
        );
        await this.treasuryContractService.markSpendFailed(
          spend.requestId,
          'Execution timeout',
        );
        return;
      }

      // Retry execution
      this.logger.log(`Retrying execution for spend ${spend.requestId}`);
      await this.spendExecutorService.executeSpend(spend.requestId);
    } catch (error) {
      this.logger.error(
        `Failed to recover stuck spend ${spend.requestId}`,
        error,
      );

      // If recovery fails repeatedly, mark as failed
      const minutesSinceUpdate =
        (Date.now() - spend.updatedAt.getTime()) / (1000 * 60);
      if (minutesSinceUpdate > 60) {
        // Stuck for over an hour, mark as failed
        await this.spendRequestRepository.update(
          { id: spend.id },
          {
            status: SpendStatus.FAILED,
            failureReason: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        );
      }
    }
  }
}

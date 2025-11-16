import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { SpendExecutorService } from '../../spend-requests/services/spend-executor.service';

@Processor('spend-execution')
export class SpendExecutionProcessor {
  private readonly logger = new Logger(SpendExecutionProcessor.name);

  constructor(private readonly spendExecutorService: SpendExecutorService) {}

  @Process('execute-spend')
  async handleExecuteSpend(job: Job<{ requestId: number }>) {
    this.logger.log(`Processing spend execution job: ${job.id}`);
    const { requestId } = job.data;

    try {
      await this.spendExecutorService.executeSpend(requestId);
      this.logger.log(`Spend ${requestId} executed successfully`);
    } catch (error) {
      this.logger.error(`Failed to execute spend ${requestId}`, error);
      throw error; // Bull will retry based on job configuration
    }
  }
}

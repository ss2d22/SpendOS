import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { SpendRequest } from '../entities/spend-request.entity';
import { SpendStatus } from '../../common/enums';
import type {
  SpendRequestedEvent,
  SpendApprovedEvent,
  SpendRejectedEvent,
  SpendExecutedEvent,
  SpendFailedEvent,
} from '../../blockchain/interfaces/treasury-events.interface';

@Injectable()
export class SpendRequestsService {
  private readonly logger = new Logger(SpendRequestsService.name);

  constructor(
    @InjectRepository(SpendRequest)
    private readonly spendRequestRepository: Repository<SpendRequest>,
    @InjectQueue('spend-execution')
    private readonly spendExecutionQueue: Queue,
  ) {}

  @OnEvent('spend.requested')
  async handleSpendRequested(event: SpendRequestedEvent) {
    this.logger.log(`Spend requested event: requestId=${event.requestId}`);

    // Check if request already exists (race condition with auto-approval)
    const existing = await this.spendRequestRepository.findOne({
      where: { requestId: event.requestId },
    });

    if (existing) {
      this.logger.log(
        `Spend request ${event.requestId} already exists, skipping creation`,
      );
      return;
    }

    const spendRequest = this.spendRequestRepository.create({
      requestId: event.requestId,
      accountId: event.accountId,
      requesterAddress: event.requesterAddress.toLowerCase(),
      amount: event.amount,
      chainId: event.chainId,
      destinationAddress: event.destinationAddress.toLowerCase(),
      description: event.description,
      status: SpendStatus.PENDING_APPROVAL,
      requestedAt: event.timestamp,
      txHash: event.txHash,
    });

    await this.spendRequestRepository.save(spendRequest);
    this.logger.log(`Spend request ${event.requestId} saved to database`);
  }

  @OnEvent('spend.approved')
  async handleSpendApproved(event: SpendApprovedEvent) {
    this.logger.log(`Spend approved event: requestId=${event.requestId}`);

    // Wait for the request to exist (race condition with auto-approval where SpendApproved fires before/during SpendRequested handler)
    let request = await this.spendRequestRepository.findOne({
      where: { requestId: event.requestId },
    });

    // If request doesn't exist yet, wait briefly and retry (up to 1 second)
    let retries = 0;
    while (!request && retries < 10) {
      this.logger.log(
        `Waiting for spend request ${event.requestId} to be created... (retry ${retries + 1}/10)`,
      );
      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait 100ms
      request = await this.spendRequestRepository.findOne({
        where: { requestId: event.requestId },
      });
      retries++;
    }

    if (!request) {
      this.logger.error(
        `Spend request ${event.requestId} still not found after waiting 1 second, skipping approval`,
      );
      return;
    }

    await this.spendRequestRepository.update(
      { requestId: event.requestId },
      {
        status: SpendStatus.APPROVED,
        approvedAt: event.timestamp,
      },
    );

    // Enqueue spend for execution
    await this.spendExecutionQueue.add(
      'execute-spend',
      { requestId: event.requestId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    this.logger.log(`Spend ${event.requestId} enqueued for execution`);
  }

  @OnEvent('spend.rejected')
  async handleSpendRejected(event: SpendRejectedEvent) {
    this.logger.log(`Spend rejected event: requestId=${event.requestId}`);

    await this.spendRequestRepository.update(
      { requestId: event.requestId },
      {
        status: SpendStatus.REJECTED,
        failureReason: event.reason,
      },
    );
  }

  @OnEvent('spend.executed')
  async handleSpendExecuted(event: SpendExecutedEvent) {
    this.logger.log(`Spend executed event: requestId=${event.requestId}`);

    await this.spendRequestRepository.update(
      { requestId: event.requestId },
      {
        status: SpendStatus.EXECUTED,
        gatewayTxId: event.gatewayTxId,
        transferId: event.gatewayTxId,
        executedAt: event.timestamp,
        treasuryTxHash: event.txHash,
      },
    );
  }

  @OnEvent('spend.failed')
  async handleSpendFailed(event: SpendFailedEvent) {
    this.logger.log(`Spend failed event: requestId=${event.requestId}`);

    await this.spendRequestRepository.update(
      { requestId: event.requestId },
      {
        status: SpendStatus.FAILED,
        failureReason: event.reason,
      },
    );
  }

  async findAll(
    accountId?: number,
    status?: SpendStatus,
    limit: number = 100,
  ): Promise<SpendRequest[]> {
    const query = this.spendRequestRepository.createQueryBuilder('request');

    if (accountId !== undefined) {
      query.andWhere('request.accountId = :accountId', { accountId });
    }

    if (status) {
      query.andWhere('request.status = :status', { status });
    }

    return query.orderBy('request.createdAt', 'DESC').take(limit).getMany();
  }

  async findOne(requestId: number): Promise<SpendRequest | null> {
    return this.spendRequestRepository.findOne({
      where: { requestId },
    });
  }

  async findByAccount(accountId: number): Promise<SpendRequest[]> {
    return this.spendRequestRepository.find({
      where: { accountId },
      order: { createdAt: 'DESC' },
    });
  }
}

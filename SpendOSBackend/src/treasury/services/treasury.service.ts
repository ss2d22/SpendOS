import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { FundingEvent } from '../entities/funding-event.entity';
import { SpendAccount } from '../../spend-accounts/entities/spend-account.entity';
import { BalanceSyncService } from './balance-sync.service';
import { AlertsService } from '../../alerts/services/alerts.service';
import { FundingDirection, AlertType, AlertSeverity } from '../../common/enums';
import type {
  InboundFundingEvent,
  AdminTransferredEvent,
  ContractPausedEvent,
  ContractUnpausedEvent,
} from '../../blockchain/interfaces/treasury-events.interface';

@Injectable()
export class TreasuryService implements OnModuleInit {
  private readonly logger = new Logger(TreasuryService.name);

  constructor(
    @InjectRepository(FundingEvent)
    private readonly fundingEventRepository: Repository<FundingEvent>,
    @InjectRepository(SpendAccount)
    private readonly spendAccountRepository: Repository<SpendAccount>,
    private readonly balanceSyncService: BalanceSyncService,
    private readonly alertsService: AlertsService,
  ) {}

  async onModuleInit() {
    // Initial balance sync
    await this.balanceSyncService.syncBalance();
  }

  @OnEvent('funding.inbound')
  async handleInboundFunding(event: InboundFundingEvent) {
    this.logger.log(`Recording inbound funding: ${event.amount} USDC`);

    const fundingEvent = this.fundingEventRepository.create({
      direction: FundingDirection.INBOUND,
      amount: event.amount,
      gatewayTxId: event.gatewayTxId,
      txHash: event.txHash,
    });

    await this.fundingEventRepository.save(fundingEvent);
  }

  async getBalance(): Promise<{
    unified: string;
    committed: string;
    available: string;
    lastSyncAt: string;
  }> {
    // Get unified balance from cache
    const { balance: unified, lastSyncAt } =
      await this.balanceSyncService.getCachedBalance();

    // Calculate total committed budget from all active accounts
    const accounts = await this.spendAccountRepository.find({
      where: { closed: false },
    });

    const committed = accounts.reduce((sum, account) => {
      return sum + BigInt(account.budgetPerPeriod);
    }, BigInt(0));

    const available = BigInt(unified) - committed;

    return {
      unified,
      committed: committed.toString(),
      available: available.toString(),
      lastSyncAt,
    };
  }

  async getFundingHistory(limit: number = 50): Promise<FundingEvent[]> {
    return this.fundingEventRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  @OnEvent('admin.transferred')
  async handleAdminTransferred(event: AdminTransferredEvent) {
    this.logger.warn(
      `Admin transferred from ${event.previousAdmin} to ${event.newAdmin}`,
    );

    // Create critical alert for admin transfer
    await this.alertsService.createAlert(
      AlertType.ADMIN_TRANSFERRED,
      `Treasury admin transferred from ${event.previousAdmin} to ${event.newAdmin}`,
      AlertSeverity.CRITICAL,
      undefined,
      {
        previousAdmin: event.previousAdmin,
        newAdmin: event.newAdmin,
        txHash: event.txHash,
      },
    );
  }

  @OnEvent('contract.paused')
  async handleContractPaused(event: ContractPausedEvent) {
    this.logger.error(`Treasury contract has been PAUSED`);

    // Create critical alert for contract pause
    await this.alertsService.createAlert(
      AlertType.CONTRACT_PAUSED,
      `Treasury contract has been paused - all operations are disabled`,
      AlertSeverity.CRITICAL,
      undefined,
      {
        txHash: event.txHash,
        pausedAt: event.timestamp,
      },
    );
  }

  @OnEvent('contract.unpaused')
  async handleContractUnpaused(event: ContractUnpausedEvent) {
    this.logger.log(`Treasury contract has been UNPAUSED`);

    // Log info - contract is operational again
    // No alert needed for unpause, operations are back to normal
  }
}

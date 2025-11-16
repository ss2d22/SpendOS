import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { SpendAccount } from '../entities/spend-account.entity';
import { TreasuryContractService } from '../../blockchain/services/treasury-contract.service';
import { AlertsService } from '../../alerts/services/alerts.service';
import { AlertType, AlertSeverity } from '../../common/enums';
import type {
  SpendAccountCreatedEvent,
  SpendAccountUpdatedEvent,
  SpendAccountFrozenEvent,
  SpendAccountUnfrozenEvent,
  SpendAccountClosedEvent,
} from '../../blockchain/interfaces/treasury-events.interface';

@Injectable()
export class SpendAccountsService {
  private readonly logger = new Logger(SpendAccountsService.name);

  constructor(
    @InjectRepository(SpendAccount)
    private readonly spendAccountRepository: Repository<SpendAccount>,
    private readonly treasuryContractService: TreasuryContractService,
    private readonly alertsService: AlertsService,
  ) {}

  @OnEvent('account.created')
  async handleAccountCreated(event: SpendAccountCreatedEvent) {
    this.logger.log(`Account created event: accountId=${event.accountId}`);

    // Fetch full account details from contract
    const accountData = await this.treasuryContractService.getAccount(
      event.accountId,
    );

    const account = this.spendAccountRepository.create({
      accountId: event.accountId,
      ownerAddress: accountData.owner.toLowerCase(),
      approverAddress: accountData.approver.toLowerCase(),
      label: accountData.label,
      budgetPerPeriod: accountData.budgetPerPeriod.toString(),
      periodDuration: Number(accountData.periodDuration),
      perTxLimit: accountData.perTxLimit.toString(),
      dailyLimit: accountData.dailyLimit.toString(),
      approvalThreshold: accountData.approvalThreshold.toString(),
      periodSpent: accountData.periodSpent.toString(),
      periodReserved: accountData.periodReserved.toString(),
      dailySpent: accountData.dailySpent.toString(),
      dailyReserved: accountData.dailyReserved.toString(),
      periodStart: new Date(Number(accountData.periodStart) * 1000),
      dailyResetAt: new Date(Number(accountData.dailyResetAt) * 1000),
      frozen: accountData.frozen,
      closed: accountData.closed,
      allowedChains: accountData.allowedChains.map((c: any) => c.toString()),
      autoTopupMinBalance: accountData.autoTopupMinBalance?.toString() || null,
      autoTopupTargetBalance:
        accountData.autoTopupTargetBalance?.toString() || null,
    });

    await this.spendAccountRepository.save(account);
    this.logger.log(`Account ${event.accountId} saved to database`);
  }

  @OnEvent('account.updated')
  async handleAccountUpdated(event: SpendAccountUpdatedEvent) {
    this.logger.log(`Account updated event: accountId=${event.accountId}`);

    // Fetch updated account details from contract
    const accountData = await this.treasuryContractService.getAccount(
      event.accountId,
    );

    await this.spendAccountRepository.update(
      { accountId: event.accountId },
      {
        ownerAddress: accountData.owner.toLowerCase(),
        approverAddress: accountData.approver.toLowerCase(),
        label: accountData.label,
        budgetPerPeriod: accountData.budgetPerPeriod.toString(),
        periodDuration: Number(accountData.periodDuration),
        perTxLimit: accountData.perTxLimit.toString(),
        dailyLimit: accountData.dailyLimit.toString(),
        approvalThreshold: accountData.approvalThreshold.toString(),
        allowedChains: accountData.allowedChains.map((c: any) => c.toString()),
        autoTopupMinBalance:
          accountData.autoTopupMinBalance?.toString() || null,
        autoTopupTargetBalance:
          accountData.autoTopupTargetBalance?.toString() || null,
      },
    );
  }

  @OnEvent('account.frozen')
  async handleAccountFrozen(event: SpendAccountFrozenEvent) {
    this.logger.log(`Account frozen event: accountId=${event.accountId}`);
    await this.spendAccountRepository.update(
      { accountId: event.accountId },
      { frozen: true },
    );

    // Create alert for frozen account
    await this.alertsService.createAlert(
      AlertType.ACCOUNT_FROZEN,
      `Spend account ${event.accountId} has been frozen`,
      AlertSeverity.WARNING,
      event.accountId,
    );
  }

  @OnEvent('account.unfrozen')
  async handleAccountUnfrozen(event: SpendAccountUnfrozenEvent) {
    this.logger.log(`Account unfrozen event: accountId=${event.accountId}`);
    await this.spendAccountRepository.update(
      { accountId: event.accountId },
      { frozen: false },
    );
  }

  @OnEvent('account.closed')
  async handleAccountClosed(event: SpendAccountClosedEvent) {
    this.logger.log(`Account closed event: accountId=${event.accountId}`);
    await this.spendAccountRepository.update(
      { accountId: event.accountId },
      { closed: true },
    );

    // Create alert for closed account
    await this.alertsService.createAlert(
      AlertType.ACCOUNT_CLOSED,
      `Spend account ${event.accountId} has been closed`,
      AlertSeverity.INFO,
      event.accountId,
    );
  }

  async findAll(): Promise<SpendAccount[]> {
    return this.spendAccountRepository.find({
      order: { accountId: 'ASC' },
    });
  }

  async findOne(accountId: number): Promise<SpendAccount | null> {
    return this.spendAccountRepository.findOne({
      where: { accountId },
    });
  }

  async findByOwner(ownerAddress: string): Promise<SpendAccount[]> {
    return this.spendAccountRepository.find({
      where: { ownerAddress: ownerAddress.toLowerCase() },
      order: { accountId: 'ASC' },
    });
  }

  async findByApprover(approverAddress: string): Promise<SpendAccount[]> {
    return this.spendAccountRepository.find({
      where: { approverAddress: approverAddress.toLowerCase() },
      order: { accountId: 'ASC' },
    });
  }
}

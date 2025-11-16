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

    // Convert status enum to frozen/closed booleans
    const status = Number(accountData.status);
    const frozen = status === 1;
    const closed = status === 2;

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
      dailyResetAt: new Date(Number(accountData.lastDayTimestamp) * 1000),
      frozen,
      closed,
      allowedChains: accountData.allowedChains.map((c: any) => c.toString()),
      autoTopupMinBalance: accountData.minBalance?.toString() || null,
      autoTopupTargetBalance: accountData.targetBalance?.toString() || null,
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
        autoTopupMinBalance: accountData.minBalance?.toString() || null,
        autoTopupTargetBalance: accountData.targetBalance?.toString() || null,
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

  // ==================== NEW WRITE OPERATIONS ====================

  async createAccount(
    owner: string,
    label: string,
    budgetPerPeriod: string,
    periodDuration: number,
    perTxLimit: string,
    dailyLimit: string,
    approvalThreshold: string,
    approver: string,
    allowedChains: number[],
  ): Promise<{ accountId: number; transactionHash: string }> {
    this.logger.log(`Creating spend account for ${owner}: ${label}`);

    const result = await this.treasuryContractService.createSpendAccount(
      owner,
      label,
      budgetPerPeriod,
      periodDuration,
      perTxLimit,
      dailyLimit || '0', // 0 means use perTxLimit
      approvalThreshold,
      approver,
      allowedChains,
    );

    this.logger.log(
      `Spend account created: ID ${result.accountId}, tx: ${result.transactionHash}`,
    );
    return result;
  }

  async updateAccount(
    accountId: number,
    budgetPerPeriod?: string,
    perTxLimit?: string,
    dailyLimit?: string,
    approvalThreshold?: string,
    approver?: string,
  ): Promise<string> {
    this.logger.log(`Updating spend account ${accountId}`);

    const transactionHash = await this.treasuryContractService.updateSpendAccount(
      accountId,
      budgetPerPeriod || '',
      perTxLimit || '',
      dailyLimit || '',
      approvalThreshold || '',
      approver || '',
    );

    this.logger.log(
      `Spend account ${accountId} updated, tx: ${transactionHash}`,
    );
    return transactionHash;
  }

  async freezeAccount(accountId: number): Promise<string> {
    this.logger.log(`Freezing account ${accountId}`);
    const transactionHash = await this.treasuryContractService.freezeAccount(accountId);
    this.logger.log(`Account ${accountId} frozen, tx: ${transactionHash}`);
    return transactionHash;
  }

  async unfreezeAccount(accountId: number): Promise<string> {
    this.logger.log(`Unfreezing account ${accountId}`);
    const transactionHash = await this.treasuryContractService.unfreezeAccount(accountId);
    this.logger.log(`Account ${accountId} unfrozen, tx: ${transactionHash}`);
    return transactionHash;
  }

  async closeAccount(accountId: number): Promise<string> {
    this.logger.log(`Closing account ${accountId}`);
    const transactionHash = await this.treasuryContractService.closeAccount(accountId);
    this.logger.log(`Account ${accountId} closed, tx: ${transactionHash}`);
    return transactionHash;
  }

  async updateAllowedChains(
    accountId: number,
    allowedChains: number[],
  ): Promise<string> {
    this.logger.log(
      `Updating allowed chains for account ${accountId}: ${allowedChains.join(', ')}`,
    );
    const transactionHash = await this.treasuryContractService.updateAllowedChains(
      accountId,
      allowedChains,
    );
    this.logger.log(
      `Allowed chains updated for account ${accountId}, tx: ${transactionHash}`,
    );
    return transactionHash;
  }

  async configureAutoTopup(
    accountId: number,
    minBalance: string,
    targetBalance: string,
  ): Promise<string> {
    this.logger.log(`Configuring auto-topup for account ${accountId}`);
    const transactionHash = await this.treasuryContractService.setAutoTopupConfig(
      accountId,
      minBalance,
      targetBalance,
    );
    this.logger.log(
      `Auto-topup configured for account ${accountId}, tx: ${transactionHash}`,
    );
    return transactionHash;
  }

  async executeAutoTopup(accountId: number): Promise<string> {
    this.logger.log(`Executing auto-topup for account ${accountId}`);
    const transactionHash = await this.treasuryContractService.autoTopup(accountId);
    this.logger.log(
      `Auto-topup executed for account ${accountId}, tx: ${transactionHash}`,
    );
    return transactionHash;
  }

  async sweepAccount(accountId: number): Promise<string> {
    this.logger.log(`Sweeping account ${accountId}`);
    const transactionHash = await this.treasuryContractService.sweepAccount(accountId);
    this.logger.log(`Account ${accountId} swept, tx: ${transactionHash}`);
    return transactionHash;
  }

  async resetPeriod(accountId: number): Promise<string> {
    this.logger.log(`Resetting period for account ${accountId}`);
    const transactionHash = await this.treasuryContractService.resetPeriod(accountId);
    this.logger.log(
      `Period reset for account ${accountId}, tx: ${transactionHash}`,
    );
    return transactionHash;
  }

  async syncAccountFromBlockchain(accountId: number): Promise<SpendAccount> {
    this.logger.log(`Syncing account ${accountId} from blockchain`);

    try {
      // Fetch account data from smart contract
      const accountData = await this.treasuryContractService.getAccount(
        accountId,
      );

      // Convert status enum to frozen/closed booleans
      // Status: 0 = Active, 1 = Frozen, 2 = Closed
      const status = Number(accountData.status);
      const frozen = status === 1;
      const closed = status === 2;

      // Check if account exists in database
      let account = await this.spendAccountRepository.findOne({
        where: { accountId },
      });

      if (account) {
        // Update existing account
        await this.spendAccountRepository.update(
          { accountId },
          {
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
            dailyResetAt: new Date(Number(accountData.lastDayTimestamp) * 1000),
            frozen,
            closed,
            allowedChains: accountData.allowedChains.map((c: any) =>
              c.toString(),
            ),
            autoTopupMinBalance: accountData.minBalance?.toString() || null,
            autoTopupTargetBalance: accountData.targetBalance?.toString() || null,
          },
        );
        account = await this.spendAccountRepository.findOne({
          where: { accountId },
        });
        this.logger.log(`Account ${accountId} updated from blockchain`);
      } else {
        // Create new account
        account = this.spendAccountRepository.create({
          accountId,
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
          dailyResetAt: new Date(Number(accountData.lastDayTimestamp) * 1000),
          frozen,
          closed,
          allowedChains: accountData.allowedChains.map((c: any) =>
            c.toString(),
          ),
          autoTopupMinBalance: accountData.minBalance?.toString() || null,
          autoTopupTargetBalance: accountData.targetBalance?.toString() || null,
        });
        await this.spendAccountRepository.save(account);
        this.logger.log(`Account ${accountId} created from blockchain`);
      }

      return account!;
    } catch (error) {
      this.logger.error(
        `Failed to sync account ${accountId} from blockchain`,
        error,
      );
      throw error;
    }
  }

  async syncAllAccountsFromBlockchain(): Promise<{
    synced: number;
    failed: number;
    total: number;
  }> {
    this.logger.log('Starting bulk sync of all accounts from blockchain');

    try {
      // Get the next account ID (total count)
      const nextAccountId = await this.treasuryContractService.getNextAccountId();
      const total = nextAccountId - 1; // Account IDs start at 1

      this.logger.log(`Found ${total} accounts to sync (IDs 1-${total})`);

      let synced = 0;
      let failed = 0;

      // Sync each account
      for (let accountId = 1; accountId <= total; accountId++) {
        try {
          await this.syncAccountFromBlockchain(accountId);
          synced++;
        } catch (error) {
          this.logger.error(`Failed to sync account ${accountId}`, error);
          failed++;
        }
      }

      this.logger.log(
        `Bulk sync complete: ${synced} synced, ${failed} failed, ${total} total`,
      );

      return { synced, failed, total };
    } catch (error) {
      this.logger.error('Failed to sync all accounts from blockchain', error);
      throw error;
    }
  }
}

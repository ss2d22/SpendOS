import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { Wallet } from 'ethers';
import { FundingEvent } from '../entities/funding-event.entity';
import { SpendAccount } from '../../spend-accounts/entities/spend-account.entity';
import { BalanceSyncService } from './balance-sync.service';
import { AlertsService } from '../../alerts/services/alerts.service';
import { TreasuryContractService } from '../../blockchain/services/treasury-contract.service';
import { GatewayApiService } from '../../gateway/services/gateway-api.service';
import { ArcProviderService } from '../../blockchain/services/arc-provider.service';
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
  private adminWallet: Wallet;

  constructor(
    @InjectRepository(FundingEvent)
    private readonly fundingEventRepository: Repository<FundingEvent>,
    @InjectRepository(SpendAccount)
    private readonly spendAccountRepository: Repository<SpendAccount>,
    private readonly balanceSyncService: BalanceSyncService,
    private readonly alertsService: AlertsService,
    private readonly treasuryContractService: TreasuryContractService,
    private readonly gatewayApiService: GatewayApiService,
    private readonly configService: ConfigService,
    private readonly arcProviderService: ArcProviderService,
  ) {
    // Initialize admin wallet for Gateway operations
    const adminPrivateKey = this.configService.get<string>(
      'backend.adminPrivateKey',
    ) as string;
    const provider = this.arcProviderService.getHttpProvider();
    this.adminWallet = new Wallet(adminPrivateKey, provider);
  }

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
    balance: string;
    balanceFormatted: string;
    currency: string;
    unified: string;
    committed: string;
    available: string;
    lastSyncAt: string;
  }> {
    // Get unified balance from cache (admin wallet's Gateway balance)
    const { balance: unified, lastSyncAt } =
      await this.balanceSyncService.getCachedBalance();

    // Calculate total committed budget from all active accounts
    const accounts = await this.spendAccountRepository.find({
      where: { closed: false },
    });

    const committed = accounts.reduce((sum, account) => {
      return sum + BigInt(account.budgetPerPeriod);
    }, BigInt(0));

    // Calculate available balance (never negative - return 0 if overcommitted)
    const unifiedBigInt = BigInt(unified);
    const availableBigInt = unifiedBigInt >= committed ? unifiedBigInt - committed : BigInt(0);

    // Convert to actual USDC dollars (divide micro USDC by 1e6)
    const balanceFormatted = (Number(unified) / 1e6).toFixed(2);
    const committedUsdc = (Number(committed) / 1e6).toFixed(2);
    const availableUsdc = (Number(availableBigInt) / 1e6).toFixed(2);

    return {
      // Frontend expects these fields in actual USDC dollars
      balance: balanceFormatted,
      balanceFormatted,
      currency: 'USDC',
      // Detailed breakdown in actual USDC dollars
      unified: balanceFormatted,
      committed: committedUsdc,
      available: availableUsdc, // Always >= 0
      lastSyncAt,
    };
  }

  /**
   * Get unified USDC balance across all supported chains via Gateway API
   * @param address - Wallet address to query (defaults to admin wallet)
   * @param chainIds - Optional array of specific chain IDs to query
   */
  async getUnifiedCrossChainBalance(address?: string, chainIds?: number[]) {
    // Default to admin wallet (holds the Gateway USDC balance)
    const walletAddress = address || this.adminWallet.address;

    this.logger.log(
      `Fetching unified cross-chain balance for ${walletAddress}`,
    );

    return this.gatewayApiService.getUnifiedBalance(walletAddress, chainIds);
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

  // ==================== NEW WRITE OPERATIONS ====================

  async fundTreasury(amount: string, gatewayTxId: string): Promise<string> {
    this.logger.log(`Funding treasury: ${amount} USDC, tx: ${gatewayTxId}`);

    const transactionHash =
      await this.treasuryContractService.recordInboundFunding(
        amount,
        gatewayTxId,
      );

    this.logger.log(`Treasury funded, tx: ${transactionHash}`);
    return transactionHash;
  }

  async pauseContract(): Promise<string> {
    this.logger.log('Pausing treasury contract');

    const transactionHash = await this.treasuryContractService.pause();

    this.logger.log(`Treasury contract paused, tx: ${transactionHash}`);
    return transactionHash;
  }

  async unpauseContract(): Promise<string> {
    this.logger.log('Unpausing treasury contract');

    const transactionHash = await this.treasuryContractService.unpause();

    this.logger.log(`Treasury contract unpaused, tx: ${transactionHash}`);
    return transactionHash;
  }

  async transferAdmin(newAdmin: string): Promise<string> {
    this.logger.log(`Transferring admin to ${newAdmin}`);

    const transactionHash =
      await this.treasuryContractService.transferAdmin(newAdmin);

    this.logger.log(`Admin transferred to ${newAdmin}, tx: ${transactionHash}`);
    return transactionHash;
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Wallet } from 'ethers';
import { ArcProviderService } from './arc-provider.service';
import { Treasury } from '../../../typechain-types';
import { Treasury__factory } from '../../../typechain-types/factories/Treasury__factory';

@Injectable()
export class TreasuryContractService implements OnModuleInit {
  private readonly logger = new Logger(TreasuryContractService.name);
  private contract: Treasury;
  private backendWallet: Wallet;
  private adminWallet: Wallet;
  private contractAddress: string;

  constructor(
    private readonly arcProviderService: ArcProviderService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.contractAddress = this.configService.get<string>(
      'arc.treasuryContractAddress',
    ) as string;
    const backendPrivateKey = this.configService.get<string>(
      'backend.privateKey',
    ) as string;
    const adminPrivateKey = this.configService.get<string>(
      'backend.adminPrivateKey',
    ) as string;

    const provider = this.arcProviderService.getHttpProvider();
    this.backendWallet = new Wallet(backendPrivateKey, provider);
    this.adminWallet = new Wallet(adminPrivateKey, provider);

    // Default contract uses backend wallet (for reads and backend operations)
    this.contract = Treasury__factory.connect(
      this.contractAddress,
      this.backendWallet,
    );

    this.logger.log(`Treasury contract initialized at ${this.contractAddress}`);
    this.logger.log(`Backend wallet: ${this.backendWallet.address}`);
    this.logger.log(`Admin wallet: ${this.adminWallet.address}`);
  }

  /**
   * Get contract instance with admin signer for admin operations
   */
  private getAdminContract(): Treasury {
    return Treasury__factory.connect(this.contractAddress, this.adminWallet);
  }

  getContract(): Treasury {
    return this.contract;
  }

  getBackendWallet(): Wallet {
    return this.backendWallet;
  }

  // ==================== BACKEND OPERATOR OPERATIONS ====================

  async markSpendExecuted(
    requestId: number,
    gatewayTxId: string,
  ): Promise<string> {
    try {
      this.logger.log(
        `Marking spend ${requestId} as executed with gateway tx ${gatewayTxId}`,
      );
      const tx = await this.contract.markSpendExecuted(requestId, gatewayTxId);
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt is null');
      this.logger.log(
        `Spend ${requestId} marked executed, tx: ${receipt.hash}`,
      );
      return receipt.hash;
    } catch (error) {
      this.logger.error(`Failed to mark spend ${requestId} as executed`, error);
      throw error;
    }
  }

  async markSpendFailed(requestId: number, reason: string): Promise<string> {
    try {
      this.logger.log(`Marking spend ${requestId} as failed: ${reason}`);
      const tx = await this.contract.markSpendFailed(requestId, reason);
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt is null');
      this.logger.log(`Spend ${requestId} marked failed, tx: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      this.logger.error(`Failed to mark spend ${requestId} as failed`, error);
      throw error;
    }
  }

  async recordInboundFunding(
    amount: string,
    gatewayTxId: string,
  ): Promise<string> {
    try {
      this.logger.log(
        `Recording inbound funding: ${amount} USDC, gateway tx: ${gatewayTxId}`,
      );
      const tx = await this.contract.recordInboundFunding(amount, gatewayTxId);
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt is null');
      this.logger.log(`Inbound funding recorded, tx: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      this.logger.error('Failed to record inbound funding', error);
      throw error;
    }
  }

  // ==================== READ OPERATIONS ====================

  async getAccount(accountId: number): Promise<any> {
    try {
      return await this.contract.getAccount(accountId);
    } catch (error) {
      this.logger.error(`Failed to get account ${accountId}`, error);
      throw error;
    }
  }

  async getRequest(requestId: number): Promise<any> {
    try {
      return await this.contract.getRequest(requestId);
    } catch (error) {
      this.logger.error(`Failed to get request ${requestId}`, error);
      throw error;
    }
  }

  async getNextAccountId(): Promise<number> {
    try {
      const nextAccountId = await this.contract.nextAccountId();
      return Number(nextAccountId);
    } catch (error) {
      this.logger.error('Failed to get next account ID', error);
      throw error;
    }
  }

  // ==================== ADMIN OPERATIONS ====================

  async createSpendAccount(
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
    try {
      this.logger.log(`Creating spend account for ${owner}: ${label}`);
      const adminContract = this.getAdminContract();
      const tx = await adminContract.createSpendAccount(
        owner,
        label,
        budgetPerPeriod,
        periodDuration,
        perTxLimit,
        dailyLimit,
        approvalThreshold,
        approver,
        allowedChains,
      );
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt is null');

      // Parse the SpendAccountCreated event to get accountId
      const event = receipt.logs
        .map((log: any) => {
          try {
            return adminContract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === 'SpendAccountCreated');

      const accountId = event?.args?.accountId
        ? Number(event.args.accountId)
        : 0;

      this.logger.log(
        `Spend account created: ID ${accountId}, tx: ${receipt.hash}`,
      );
      return { accountId, transactionHash: receipt.hash };
    } catch (error) {
      this.logger.error('Failed to create spend account', error);
      throw error;
    }
  }

  async updateSpendAccount(
    accountId: number,
    budgetPerPeriod: string,
    perTxLimit: string,
    dailyLimit: string,
    approvalThreshold: string,
    approver: string,
  ): Promise<string> {
    try {
      this.logger.log(`Updating spend account ${accountId}`);
      const adminContract = this.getAdminContract();
      const tx = await adminContract.updateSpendAccount(
        accountId,
        budgetPerPeriod || '0',
        perTxLimit || '0',
        dailyLimit || '0',
        approvalThreshold || '0',
        approver || '0x0000000000000000000000000000000000000000',
      );
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt is null');
      this.logger.log(
        `Spend account ${accountId} updated, tx: ${receipt.hash}`,
      );
      return receipt.hash;
    } catch (error) {
      this.logger.error(`Failed to update spend account ${accountId}`, error);
      throw error;
    }
  }

  async freezeAccount(accountId: number): Promise<string> {
    try {
      this.logger.log(`Freezing account ${accountId}`);
      const adminContract = this.getAdminContract();
      const tx = await adminContract.freezeAccount(accountId);
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt is null');
      this.logger.log(`Account ${accountId} frozen, tx: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      this.logger.error(`Failed to freeze account ${accountId}`, error);
      throw error;
    }
  }

  async unfreezeAccount(accountId: number): Promise<string> {
    try {
      this.logger.log(`Unfreezing account ${accountId}`);
      const adminContract = this.getAdminContract();
      const tx = await adminContract.unfreezeAccount(accountId);
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt is null');
      this.logger.log(`Account ${accountId} unfrozen, tx: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      this.logger.error(`Failed to unfreeze account ${accountId}`, error);
      throw error;
    }
  }

  async closeAccount(accountId: number): Promise<string> {
    try {
      this.logger.log(`Closing account ${accountId}`);
      const adminContract = this.getAdminContract();
      const tx = await adminContract.closeAccount(accountId);
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt is null');
      this.logger.log(`Account ${accountId} closed, tx: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      this.logger.error(`Failed to close account ${accountId}`, error);
      throw error;
    }
  }

  async updateAllowedChains(
    accountId: number,
    allowedChains: number[],
  ): Promise<string> {
    try {
      this.logger.log(
        `Updating allowed chains for account ${accountId}: ${allowedChains.join(', ')}`,
      );
      const adminContract = this.getAdminContract();
      const tx = await adminContract.updateAllowedChains(
        accountId,
        allowedChains,
      );
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt is null');
      this.logger.log(
        `Allowed chains updated for account ${accountId}, tx: ${receipt.hash}`,
      );
      return receipt.hash;
    } catch (error) {
      this.logger.error(
        `Failed to update allowed chains for account ${accountId}`,
        error,
      );
      throw error;
    }
  }

  async setAutoTopupConfig(
    accountId: number,
    minBalance: string,
    targetBalance: string,
  ): Promise<string> {
    try {
      this.logger.log(`Setting auto-topup config for account ${accountId}`);
      const adminContract = this.getAdminContract();
      const tx = await adminContract.setAutoTopupConfig(
        accountId,
        minBalance,
        targetBalance,
      );
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt is null');
      this.logger.log(
        `Auto-topup config set for account ${accountId}, tx: ${receipt.hash}`,
      );
      return receipt.hash;
    } catch (error) {
      this.logger.error(
        `Failed to set auto-topup config for account ${accountId}`,
        error,
      );
      throw error;
    }
  }

  async autoTopup(accountId: number): Promise<string> {
    try {
      this.logger.log(`Triggering auto-topup for account ${accountId}`);
      const adminContract = this.getAdminContract();
      const tx = await adminContract.autoTopup(accountId);
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt is null');
      this.logger.log(
        `Auto-topup triggered for account ${accountId}, tx: ${receipt.hash}`,
      );
      return receipt.hash;
    } catch (error) {
      this.logger.error(
        `Failed to trigger auto-topup for account ${accountId}`,
        error,
      );
      throw error;
    }
  }

  async sweepAccount(accountId: number): Promise<string> {
    try {
      this.logger.log(`Sweeping account ${accountId}`);
      const adminContract = this.getAdminContract();
      const tx = await adminContract.sweepAccount(accountId);
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt is null');
      this.logger.log(`Account ${accountId} swept, tx: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      this.logger.error(`Failed to sweep account ${accountId}`, error);
      throw error;
    }
  }

  async resetPeriod(accountId: number): Promise<string> {
    try {
      this.logger.log(`Resetting period for account ${accountId}`);
      const adminContract = this.getAdminContract();
      const tx = await adminContract.resetPeriod(accountId);
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt is null');
      this.logger.log(
        `Period reset for account ${accountId}, tx: ${receipt.hash}`,
      );
      return receipt.hash;
    } catch (error) {
      this.logger.error(
        `Failed to reset period for account ${accountId}`,
        error,
      );
      throw error;
    }
  }

  async requestSpend(
    accountId: number,
    amount: string,
    chainId: number,
    destinationAddress: string,
    description: string,
  ): Promise<{ requestId: number; transactionHash: string }> {
    try {
      this.logger.log(
        `Requesting spend from account ${accountId}: ${amount} USDC`,
      );
      const adminContract = this.getAdminContract();
      const tx = await adminContract.requestSpend(
        accountId,
        amount,
        chainId,
        destinationAddress,
        description,
      );
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt is null');

      // Parse the SpendRequested event to get requestId
      const event = receipt.logs
        .map((log: any) => {
          try {
            return adminContract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === 'SpendRequested');

      const requestId = event?.args?.requestId
        ? Number(event.args.requestId)
        : 0;

      this.logger.log(
        `Spend requested: ID ${requestId}, tx: ${receipt.hash}`,
      );
      return { requestId, transactionHash: receipt.hash };
    } catch (error) {
      this.logger.error('Failed to request spend', error);
      throw error;
    }
  }

  async approveSpend(requestId: number): Promise<string> {
    try {
      this.logger.log(`Approving spend request ${requestId}`);
      const adminContract = this.getAdminContract();
      const tx = await adminContract.approveSpend(requestId);
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt is null');
      this.logger.log(
        `Spend request ${requestId} approved, tx: ${receipt.hash}`,
      );
      return receipt.hash;
    } catch (error) {
      this.logger.error(`Failed to approve spend ${requestId}`, error);
      throw error;
    }
  }

  async rejectSpend(requestId: number, reason: string): Promise<string> {
    try {
      this.logger.log(`Rejecting spend request ${requestId}: ${reason}`);
      const adminContract = this.getAdminContract();
      const tx = await adminContract.rejectSpend(requestId, reason);
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt is null');
      this.logger.log(
        `Spend request ${requestId} rejected, tx: ${receipt.hash}`,
      );
      return receipt.hash;
    } catch (error) {
      this.logger.error(`Failed to reject spend ${requestId}`, error);
      throw error;
    }
  }

  async pause(): Promise<string> {
    try {
      this.logger.log('Pausing treasury contract');
      const adminContract = this.getAdminContract();
      const tx = await adminContract.pause();
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt is null');
      this.logger.log(`Contract paused, tx: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      this.logger.error('Failed to pause contract', error);
      throw error;
    }
  }

  async unpause(): Promise<string> {
    try {
      this.logger.log('Unpausing treasury contract');
      const adminContract = this.getAdminContract();
      const tx = await adminContract.unpause();
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt is null');
      this.logger.log(`Contract unpaused, tx: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      this.logger.error('Failed to unpause contract', error);
      throw error;
    }
  }

  async transferAdmin(newAdmin: string): Promise<string> {
    try {
      this.logger.log(`Transferring admin to ${newAdmin}`);
      const adminContract = this.getAdminContract();
      const tx = await adminContract.transferAdmin(newAdmin);
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt is null');
      this.logger.log(`Admin transferred to ${newAdmin}, tx: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      this.logger.error('Failed to transfer admin', error);
      throw error;
    }
  }
}

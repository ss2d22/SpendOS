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

  constructor(
    private readonly arcProviderService: ArcProviderService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const contractAddress = this.configService.get<string>(
      'arc.treasuryContractAddress',
    ) as string;
    const privateKey = this.configService.get<string>(
      'backend.privateKey',
    ) as string;

    const provider = this.arcProviderService.getHttpProvider();
    this.backendWallet = new Wallet(privateKey, provider);

    this.contract = Treasury__factory.connect(
      contractAddress,
      this.backendWallet,
    );

    this.logger.log(`Treasury contract initialized at ${contractAddress}`);
    this.logger.log(`Backend wallet: ${this.backendWallet.address}`);
  }

  getContract(): Treasury {
    return this.contract;
  }

  getBackendWallet(): Wallet {
    return this.backendWallet;
  }

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
}

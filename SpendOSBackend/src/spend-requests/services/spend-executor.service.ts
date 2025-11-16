import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpendRequest } from '../entities/spend-request.entity';
import { BurnIntentService } from '../../gateway/services/burn-intent.service';
import { GatewayApiService } from '../../gateway/services/gateway-api.service';
import { CrossChainMintService } from '../../gateway/services/cross-chain-mint.service';
import { TreasuryContractService } from '../../blockchain/services/treasury-contract.service';
import { SpendStatus } from '../../common/enums';

@Injectable()
export class SpendExecutorService {
  private readonly logger = new Logger(SpendExecutorService.name);

  constructor(
    @InjectRepository(SpendRequest)
    private readonly spendRequestRepository: Repository<SpendRequest>,
    private readonly burnIntentService: BurnIntentService,
    private readonly gatewayApiService: GatewayApiService,
    private readonly crossChainMintService: CrossChainMintService,
    private readonly treasuryContractService: TreasuryContractService,
  ) {}

  async executeSpend(requestId: number): Promise<void> {
    this.logger.log(`Starting execution of spend request ${requestId}`);

    try {
      // Load spend request
      const spendRequest = await this.spendRequestRepository.findOne({
        where: { requestId },
      });

      if (!spendRequest) {
        throw new Error(`Spend request ${requestId} not found`);
      }

      // Check status
      if (
        spendRequest.status !== SpendStatus.APPROVED &&
        spendRequest.status !== SpendStatus.EXECUTING
      ) {
        throw new Error(
          `Spend request ${requestId} is not in APPROVED status (current: ${spendRequest.status})`,
        );
      }

      // Update status to EXECUTING
      await this.spendRequestRepository.update(
        { requestId },
        { status: SpendStatus.EXECUTING },
      );

      // Step 1: Create and sign burn intent
      this.logger.log(`Creating burn intent for ${spendRequest.amount} USDC`);
      const signedBurnIntent =
        await this.burnIntentService.createAndSignBurnIntent(
          spendRequest.amount,
          spendRequest.chainId,
          spendRequest.destinationAddress,
        );

      // Step 2: Submit to Gateway
      this.logger.log('Submitting burn intent to Gateway');
      const gatewayResponse = await this.gatewayApiService.submitBurnIntent([
        signedBurnIntent,
      ]);

      const { attestation, signature } = gatewayResponse;
      this.logger.log(`Gateway attestation received`);

      // Step 3: Mint on destination chain
      this.logger.log(`Minting on destination chain ${spendRequest.chainId}`);
      const mintTxHash = await this.crossChainMintService.mintOnDestination(
        spendRequest.chainId,
        attestation,
        signature,
      );

      this.logger.log(`Mint transaction: ${mintTxHash}`);

      // Use mint tx hash as transfer ID
      const transferId = mintTxHash;

      // Step 4: Mark spend executed on Treasury contract
      this.logger.log('Marking spend as executed on Treasury contract');
      const treasuryTxHash =
        await this.treasuryContractService.markSpendExecuted(
          requestId,
          transferId,
        );

      this.logger.log(`Treasury execution tx: ${treasuryTxHash}`);

      // Step 5: Update database
      await this.spendRequestRepository.update(
        { requestId },
        {
          status: SpendStatus.EXECUTED,
          gatewayTxId: transferId,
          transferId,
          mintTxHash,
          treasuryTxHash,
          executedAt: new Date(),
        },
      );

      this.logger.log(`Spend request ${requestId} executed successfully`);
    } catch (error) {
      this.logger.error(`Failed to execute spend ${requestId}`, error);

      // Mark as failed in database
      await this.spendRequestRepository.update(
        { requestId },
        {
          status: SpendStatus.FAILED,
          failureReason: error.message,
        },
      );

      // Try to mark as failed on contract
      try {
        await this.treasuryContractService.markSpendFailed(
          requestId,
          error.message.substring(0, 256),
        );
      } catch (contractError) {
        this.logger.error(
          `Failed to mark spend ${requestId} as failed on contract`,
          contractError,
        );
      }

      throw error;
    }
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Wallet, Contract, parseUnits } from 'ethers';
import { ArcProviderService } from '../../blockchain/services/arc-provider.service';
import { retryWithBackoff } from '../../common/utils/retry.util';

/**
 * Gateway Deposit Service
 *
 * Automatically deposits USDC from admin wallet to Gateway Wallet contract
 * to maintain unified cross-chain balance. Runs every 10 minutes.
 *
 * Reserve: Keeps 20 USDC in admin wallet for gas and operational expenses
 */
@Injectable()
export class GatewayDepositService implements OnModuleInit {
  private readonly logger = new Logger(GatewayDepositService.name);
  private adminWallet: Wallet;
  private usdcContract: Contract;
  private gatewayWalletContract: Contract;

  // Gateway Wallet address on Arc Testnet
  private readonly gatewayWalletAddress =
    '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';

  // USDC address on Arc Testnet
  private readonly usdcAddress =
    '0x3600000000000000000000000000000000000000';

  // Reserve amount to keep in admin wallet (20 USDC)
  private readonly reserveAmount = parseUnits('20', 6); // 20 USDC in micro USDC

  constructor(
    private readonly configService: ConfigService,
    private readonly arcProviderService: ArcProviderService,
  ) {}

  async onModuleInit() {
    // Wait for provider to be ready
    const provider = this.arcProviderService.getHttpProvider();

    // Initialize admin wallet
    const adminPrivateKey = this.configService.get<string>(
      'backend.adminPrivateKey',
    ) as string;
    this.adminWallet = new Wallet(adminPrivateKey, provider);

    this.logger.log(`Gateway deposit service initialized`);
    this.logger.log(`Admin wallet: ${this.adminWallet.address}`);
    this.logger.log(`Reserve amount: 20 USDC`);

    // Initialize USDC contract
    const usdcAbi = [
      'function balanceOf(address account) external view returns (uint256)',
      'function approve(address spender, uint256 amount) external returns (bool)',
      'function allowance(address owner, address spender) external view returns (uint256)',
    ];
    this.usdcContract = new Contract(this.usdcAddress, usdcAbi, this.adminWallet);

    // Initialize Gateway Wallet contract
    const gatewayWalletAbi = [
      'function deposit(address token, uint256 amount) external',
      'function availableBalance(address token, address depositor) external view returns (uint256)',
    ];
    this.gatewayWalletContract = new Contract(
      this.gatewayWalletAddress,
      gatewayWalletAbi,
      this.adminWallet,
    );

    this.logger.log('Gateway Wallet and USDC contracts initialized');
  }

  /**
   * Auto-deposit excess USDC to Gateway every 10 minutes
   * Keeps 20 USDC reserve in admin wallet for gas/operations
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async autoDeposit() {
    try {
      // Safety check: ensure contracts are initialized
      if (!this.usdcContract || !this.gatewayWalletContract || !this.adminWallet) {
        this.logger.warn('Contracts not yet initialized, skipping auto-deposit');
        return;
      }

      this.logger.log('Checking admin wallet balance for auto-deposit...');

      // Get admin wallet USDC balance (with retry)
      const balance = await retryWithBackoff(
        () => this.usdcContract.balanceOf(this.adminWallet.address),
        { logger: this.logger },
      );
      const balanceUsdc = Number(balance) / 1e6;

      this.logger.log(
        `Admin wallet USDC balance: ${balanceUsdc.toFixed(2)} USDC`,
      );

      // Calculate amount to deposit (balance - 20 USDC reserve)
      if (balance <= this.reserveAmount) {
        this.logger.log(
          `Balance (${balanceUsdc.toFixed(2)} USDC) is below or equal to reserve (20 USDC). Skipping deposit.`,
        );
        return;
      }

      const depositAmount = balance - this.reserveAmount;
      const depositUsdc = Number(depositAmount) / 1e6;

      this.logger.log(
        `Depositing ${depositUsdc.toFixed(2)} USDC to Gateway (keeping 20 USDC reserve)`,
      );

      // Check if approval is needed (with retry)
      const currentAllowance = await retryWithBackoff(
        () =>
          this.usdcContract.allowance(
            this.adminWallet.address,
            this.gatewayWalletAddress,
          ),
        { logger: this.logger },
      );

      if (currentAllowance < depositAmount) {
        this.logger.log('Approving Gateway Wallet to spend USDC...');
        const approveTx = await retryWithBackoff(
          () =>
            this.usdcContract.approve(this.gatewayWalletAddress, depositAmount),
          { logger: this.logger, maxRetries: 5 },
        );
        await retryWithBackoff(() => approveTx.wait(), {
          logger: this.logger,
          maxRetries: 5,
        });
        this.logger.log(`Approval transaction: ${approveTx.hash}`);
      }

      // Deposit to Gateway Wallet (with retry)
      this.logger.log('Depositing USDC to Gateway Wallet...');
      const depositTx = await retryWithBackoff(
        () => this.gatewayWalletContract.deposit(this.usdcAddress, depositAmount),
        { logger: this.logger, maxRetries: 5 },
      );
      await retryWithBackoff(() => depositTx.wait(), {
        logger: this.logger,
        maxRetries: 5,
      });

      this.logger.log(`✓ Successfully deposited ${depositUsdc.toFixed(2)} USDC to Gateway`);
      this.logger.log(`Transaction hash: ${depositTx.hash}`);

      // Verify new Gateway balance (with retry)
      const gatewayBalance = await retryWithBackoff(
        () =>
          this.gatewayWalletContract.availableBalance(
            this.usdcAddress,
            this.adminWallet.address,
          ),
        { logger: this.logger },
      );
      const gatewayBalanceUsdc = Number(gatewayBalance) / 1e6;
      this.logger.log(
        `New Gateway balance: ${gatewayBalanceUsdc.toFixed(2)} USDC`,
      );
    } catch (error) {
      this.logger.error('Failed to auto-deposit to Gateway:', error);
      if (error.message) {
        this.logger.error(`Error message: ${error.message}`);
      }
    }
  }

  /**
   * Manually trigger deposit (for testing or emergency)
   */
  async manualDeposit(amount?: string) {
    // Safety check: ensure contracts are initialized
    if (!this.usdcContract || !this.gatewayWalletContract || !this.adminWallet) {
      throw new Error('Contracts not yet initialized');
    }

    this.logger.log('Manual deposit triggered');

    if (amount) {
      // Deposit specific amount
      const depositAmount = parseUnits(amount, 6);
      await this.depositToGateway(depositAmount);
    } else {
      // Use auto-deposit logic (deposit all except reserve)
      await this.autoDeposit();
    }
  }

  /**
   * Internal method to deposit USDC to Gateway
   */
  private async depositToGateway(amount: bigint) {
    const amountUsdc = Number(amount) / 1e6;
    this.logger.log(`Depositing ${amountUsdc.toFixed(2)} USDC to Gateway...`);

    // Approve (with retry)
    const currentAllowance = await retryWithBackoff(
      () =>
        this.usdcContract.allowance(
          this.adminWallet.address,
          this.gatewayWalletAddress,
        ),
      { logger: this.logger },
    );

    if (currentAllowance < amount) {
      this.logger.log('Approving Gateway Wallet...');
      const approveTx = await retryWithBackoff(
        () => this.usdcContract.approve(this.gatewayWalletAddress, amount),
        { logger: this.logger, maxRetries: 5 },
      );
      await retryWithBackoff(() => approveTx.wait(), {
        logger: this.logger,
        maxRetries: 5,
      });
      this.logger.log(`Approved: ${approveTx.hash}`);
    }

    // Deposit (with retry)
    const depositTx = await retryWithBackoff(
      () => this.gatewayWalletContract.deposit(this.usdcAddress, amount),
      { logger: this.logger, maxRetries: 5 },
    );
    await retryWithBackoff(() => depositTx.wait(), {
      logger: this.logger,
      maxRetries: 5,
    });

    this.logger.log(`✓ Deposited ${amountUsdc.toFixed(2)} USDC to Gateway`);
    this.logger.log(`Transaction hash: ${depositTx.hash}`);
  }

  /**
   * Get current admin wallet and Gateway balances
   */
  async getBalances() {
    // Safety check: ensure contracts are initialized
    if (!this.usdcContract || !this.gatewayWalletContract || !this.adminWallet) {
      throw new Error('Contracts not yet initialized');
    }

    const walletBalance = await retryWithBackoff(
      () => this.usdcContract.balanceOf(this.adminWallet.address),
      { logger: this.logger },
    );
    const gatewayBalance = await retryWithBackoff(
      () =>
        this.gatewayWalletContract.availableBalance(
          this.usdcAddress,
          this.adminWallet.address,
        ),
      { logger: this.logger },
    );

    return {
      walletAddress: this.adminWallet.address,
      walletBalance: (Number(walletBalance) / 1e6).toFixed(2),
      gatewayBalance: (Number(gatewayBalance) / 1e6).toFixed(2),
      reserveAmount: '20.00',
    };
  }
}

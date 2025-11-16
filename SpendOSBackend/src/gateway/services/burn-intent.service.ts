import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Wallet,
  TypedDataDomain,
  TypedDataField,
  MaxUint256,
  randomBytes,
  zeroPadValue,
  hexlify,
} from 'ethers';
import { ArcProviderService } from '../../blockchain/services/arc-provider.service';
import {
  BurnIntent,
  SignedBurnIntent,
  TransferSpec,
  CHAIN_DOMAINS,
  GATEWAY_CONTRACTS,
} from '../interfaces/burn-intent.interface';

@Injectable()
export class BurnIntentService {
  private readonly logger = new Logger(BurnIntentService.name);
  private gatewayWallet: Wallet;
  private readonly MIN_FEE = '2010000'; // 2.01 USDC minimum fee
  private readonly ARC_TESTNET_CHAIN_ID = 5042002;

  constructor(
    private readonly configService: ConfigService,
    private readonly arcProviderService: ArcProviderService,
  ) {
    const privateKey = this.configService.get<string>(
      'gateway.walletPrivateKey',
    ) as string;
    const provider = this.arcProviderService.getHttpProvider();
    this.gatewayWallet = new Wallet(privateKey, provider);
    this.logger.log(
      `Gateway wallet initialized: ${this.gatewayWallet.address}`,
    );
  }

  /**
   * Creates and signs a burn intent for Circle Gateway
   * @param amount - Amount in USDC (6 decimals) as string
   * @param destinationChainId - Destination chain ID
   * @param destinationAddress - Recipient address on destination chain
   */
  async createAndSignBurnIntent(
    amount: string,
    destinationChainId: number,
    destinationAddress: string,
  ): Promise<SignedBurnIntent> {
    try {
      const sourceChainId = this.ARC_TESTNET_CHAIN_ID;

      // Get domain IDs
      const sourceDomain = CHAIN_DOMAINS[sourceChainId];
      const destinationDomain = CHAIN_DOMAINS[destinationChainId];

      if (sourceDomain === undefined || destinationDomain === undefined) {
        throw new Error(
          `Unsupported chain IDs: source=${sourceChainId}, dest=${destinationChainId}`,
        );
      }

      // Get contract addresses
      const sourceContracts = GATEWAY_CONTRACTS[sourceChainId];
      const destContracts = GATEWAY_CONTRACTS[destinationChainId];

      if (!sourceContracts || !destContracts) {
        throw new Error(
          `Missing contract addresses for chains: ${sourceChainId}, ${destinationChainId}`,
        );
      }

      // Generate random salt for uniqueness
      const salt = hexlify(randomBytes(32));

      // Build transfer specification with bytes32 addresses
      // Gateway API requires all addresses to be 32-byte hex strings
      const spec: TransferSpec = {
        version: 1,
        sourceDomain,
        destinationDomain,
        sourceContract: this.addressToBytes32(sourceContracts.wallet),
        destinationContract: this.addressToBytes32(destContracts.minter),
        sourceToken: this.addressToBytes32(sourceContracts.usdc),
        destinationToken: this.addressToBytes32(destContracts.usdc),
        sourceDepositor: this.addressToBytes32(this.gatewayWallet.address),
        destinationRecipient: this.addressToBytes32(destinationAddress),
        sourceSigner: this.addressToBytes32(this.gatewayWallet.address),
        destinationCaller: this.addressToBytes32(
          '0x0000000000000000000000000000000000000000',
        ),
        value: amount,
        salt,
        hookData: '0x',
      };

      // Build burn intent with max values for flexibility
      const burnIntent: BurnIntent = {
        maxBlockHeight: MaxUint256.toString(),
        maxFee: this.MIN_FEE,
        spec,
      };

      this.logger.log('Creating burn intent:', {
        sourceChainId,
        destinationChainId,
        sourceDomain,
        destinationDomain,
        amount,
        destinationAddress,
        expiryBlock: burnIntent.maxBlockHeight,
        fee: burnIntent.maxFee,
      });

      // Create EIP-712 typed data for signing
      const domain: TypedDataDomain = {
        name: 'GatewayWallet',
        version: '1',
      };

      const types: Record<string, TypedDataField[]> = {
        TransferSpec: [
          { name: 'version', type: 'uint32' },
          { name: 'sourceDomain', type: 'uint32' },
          { name: 'destinationDomain', type: 'uint32' },
          { name: 'sourceContract', type: 'bytes32' },
          { name: 'destinationContract', type: 'bytes32' },
          { name: 'sourceToken', type: 'bytes32' },
          { name: 'destinationToken', type: 'bytes32' },
          { name: 'sourceDepositor', type: 'bytes32' },
          { name: 'destinationRecipient', type: 'bytes32' },
          { name: 'sourceSigner', type: 'bytes32' },
          { name: 'destinationCaller', type: 'bytes32' },
          { name: 'value', type: 'uint256' },
          { name: 'salt', type: 'bytes32' },
          { name: 'hookData', type: 'bytes' },
        ],
        BurnIntent: [
          { name: 'maxBlockHeight', type: 'uint256' },
          { name: 'maxFee', type: 'uint256' },
          { name: 'spec', type: 'TransferSpec' },
        ],
      };

      // spec already has bytes32 addresses, use it directly for signing
      const message = {
        maxBlockHeight: burnIntent.maxBlockHeight,
        maxFee: burnIntent.maxFee,
        spec,
      };

      // Sign the typed data
      const signature = await this.gatewayWallet.signTypedData(
        domain,
        types,
        message,
      );

      this.logger.log('Burn intent signed successfully');

      return {
        burnIntent,
        signature,
      };
    } catch (error) {
      this.logger.error('Failed to create and sign burn intent', error);
      throw error;
    }
  }

  /**
   * Converts an Ethereum address to bytes32 format (left-padded with zeros)
   */
  private addressToBytes32(address: string): string {
    return zeroPadValue(address.toLowerCase(), 32);
  }

  getGatewayWallet(): Wallet {
    return this.gatewayWallet;
  }
}

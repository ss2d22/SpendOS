import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BurnIntentService } from './burn-intent.service';
import { ArcProviderService } from '../../blockchain/services/arc-provider.service';
import { JsonRpcProvider } from 'ethers';

describe('BurnIntentService', () => {
  let service: BurnIntentService;
  let configService: ConfigService;
  let arcProviderService: ArcProviderService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockProvider = {
    getBlockNumber: jest.fn(),
  } as unknown as JsonRpcProvider;

  const mockArcProviderService = {
    getHttpProvider: jest.fn().mockReturnValue(mockProvider),
    getBlockNumber: jest.fn(),
  };

  beforeEach(async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      const config: Record<string, any> = {
        'gateway.walletPrivateKey':
          '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
        'arc.chainId': 5042002,
      };
      return config[key];
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BurnIntentService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: ArcProviderService,
          useValue: mockArcProviderService,
        },
      ],
    }).compile();

    service = module.get<BurnIntentService>(BurnIntentService);
    configService = module.get<ConfigService>(ConfigService);
    arcProviderService = module.get<ArcProviderService>(ArcProviderService);

    jest.clearAllMocks();
  });

  describe('createAndSignBurnIntent', () => {
    it('should create and sign a burn intent successfully', async () => {
      const amount = '1000000'; // 1 USDC
      const chainId = 84532; // Base Sepolia
      const destinationAddress = '0x1234567890123456789012345678901234567890';
      const currentBlock = 1000;

      mockArcProviderService.getBlockNumber = jest
        .fn()
        .mockResolvedValue(currentBlock);

      const result = await service.createAndSignBurnIntent(
        amount,
        chainId,
        destinationAddress,
      );

      expect(result).toHaveProperty('burnIntent');
      expect(result).toHaveProperty('signature');
      expect(result.burnIntent.amount).toBe(amount);
      expect(result.burnIntent.chainId).toBe(chainId);
      expect(result.burnIntent.destinationAddress).toBe(destinationAddress);
      expect(result.burnIntent.expiryBlock).toBe(currentBlock + 1000);
      expect(result.burnIntent.fee).toBe('1000000'); // Fixed fee
      expect(typeof result.signature).toBe('string');
      expect(result.signature.startsWith('0x')).toBe(true);
    });

    it('should set expiry block 1000 blocks in the future', async () => {
      const amount = '2000000';
      const chainId = 84532;
      const destinationAddress = '0x1234567890123456789012345678901234567890';
      const currentBlock = 5000;

      mockArcProviderService.getBlockNumber = jest
        .fn()
        .mockResolvedValue(currentBlock);

      const result = await service.createAndSignBurnIntent(
        amount,
        chainId,
        destinationAddress,
      );

      expect(result.burnIntent.expiryBlock).toBe(6000);
    });

    it('should calculate fixed fee correctly', async () => {
      const amount = '10000000'; // 10 USDC
      const chainId = 84532;
      const destinationAddress = '0x1234567890123456789012345678901234567890';

      mockArcProviderService.getBlockNumber = jest.fn().mockResolvedValue(1000);

      const result = await service.createAndSignBurnIntent(
        amount,
        chainId,
        destinationAddress,
      );

      expect(result.burnIntent.fee).toBe('1000000'); // 1 USDC fixed fee
    });

    it('should throw error when block number fetch fails', async () => {
      const amount = '1000000';
      const chainId = 84532;
      const destinationAddress = '0x1234567890123456789012345678901234567890';

      mockArcProviderService.getBlockNumber = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));

      await expect(
        service.createAndSignBurnIntent(amount, chainId, destinationAddress),
      ).rejects.toThrow();
    });

    it('should create valid EIP-712 signature', async () => {
      const amount = '1000000';
      const chainId = 84532;
      const destinationAddress = '0x1234567890123456789012345678901234567890';

      mockArcProviderService.getBlockNumber = jest.fn().mockResolvedValue(1000);

      const result = await service.createAndSignBurnIntent(
        amount,
        chainId,
        destinationAddress,
      );

      // Signature should be 132 characters (0x + 130 hex chars)
      expect(result.signature.length).toBe(132);
      expect(result.signature).toMatch(/^0x[0-9a-f]{130}$/i);
    });
  });

  describe('getGatewayWallet', () => {
    it('should return the gateway wallet', () => {
      const wallet = service.getGatewayWallet();
      expect(wallet).toBeDefined();
      expect(wallet.address).toBeDefined();
      expect(typeof wallet.address).toBe('string');
    });
  });
});

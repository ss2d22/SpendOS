import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BalanceSyncService } from './balance-sync.service';
import { GatewayApiService } from '../../gateway/services/gateway-api.service';
import { RedisService } from '../../redis/services/redis.service';
import { TreasuryContractService } from '../../blockchain/services/treasury-contract.service';

describe('BalanceSyncService', () => {
  let service: BalanceSyncService;
  let gatewayApiService: GatewayApiService;
  let redisService: RedisService;
  let treasuryContractService: TreasuryContractService;

  const mockGatewayApiService = {
    getUnifiedBalance: jest.fn(),
  };

  const mockRedisService = {
    set: jest.fn(),
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockTreasuryContractService = {
    getBackendWallet: jest.fn(),
  };

  const mockWallet = {
    address: '0x1234567890123456789012345678901234567890',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalanceSyncService,
        {
          provide: GatewayApiService,
          useValue: mockGatewayApiService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: TreasuryContractService,
          useValue: mockTreasuryContractService,
        },
      ],
    }).compile();

    service = module.get<BalanceSyncService>(BalanceSyncService);
    gatewayApiService = module.get<GatewayApiService>(GatewayApiService);
    redisService = module.get<RedisService>(RedisService);
    treasuryContractService = module.get<TreasuryContractService>(
      TreasuryContractService,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncBalance', () => {
    it('should fetch unified balance from Gateway and cache in Redis', async () => {
      mockTreasuryContractService.getBackendWallet.mockReturnValue(mockWallet);
      mockGatewayApiService.getUnifiedBalance.mockResolvedValue({
        balance: '5000000000',
        symbol: 'USDC',
      });
      mockRedisService.set.mockResolvedValue('OK');

      await service.syncBalance();

      expect(mockTreasuryContractService.getBackendWallet).toHaveBeenCalled();
      expect(mockGatewayApiService.getUnifiedBalance).toHaveBeenCalledWith(
        'USDC',
        '0x1234567890123456789012345678901234567890',
      );
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'treasury:unified_balance',
        '5000000000',
      );
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'treasury:last_sync',
        expect.any(String),
      );
    });

    it('should handle zero balance', async () => {
      mockTreasuryContractService.getBackendWallet.mockReturnValue(mockWallet);
      mockGatewayApiService.getUnifiedBalance.mockResolvedValue({
        balance: '0',
        symbol: 'USDC',
      });
      mockRedisService.set.mockResolvedValue('OK');

      await service.syncBalance();

      expect(mockRedisService.set).toHaveBeenCalledWith(
        'treasury:unified_balance',
        '0',
      );
    });

    it('should default to 0 if balance is undefined', async () => {
      mockTreasuryContractService.getBackendWallet.mockReturnValue(mockWallet);
      mockGatewayApiService.getUnifiedBalance.mockResolvedValue({
        symbol: 'USDC',
      });
      mockRedisService.set.mockResolvedValue('OK');

      await service.syncBalance();

      expect(mockRedisService.set).toHaveBeenCalledWith(
        'treasury:unified_balance',
        '0',
      );
    });

    it('should handle Gateway API errors gracefully', async () => {
      mockTreasuryContractService.getBackendWallet.mockReturnValue(mockWallet);
      mockGatewayApiService.getUnifiedBalance.mockRejectedValue(
        new Error('Gateway timeout'),
      );

      // Should not throw, error is caught and logged
      await expect(service.syncBalance()).resolves.not.toThrow();
    });

    it('should cache timestamp of sync', async () => {
      const beforeSync = Date.now();
      mockTreasuryContractService.getBackendWallet.mockReturnValue(mockWallet);
      mockGatewayApiService.getUnifiedBalance.mockResolvedValue({
        balance: '1000000',
      });
      mockRedisService.set.mockResolvedValue('OK');

      await service.syncBalance();

      const timestampCall = mockRedisService.set.mock.calls.find(
        (call) => call[0] === 'treasury:last_sync',
      );
      expect(timestampCall).toBeDefined();

      const cachedTimestamp = new Date(timestampCall[1]);
      const afterSync = Date.now();

      expect(cachedTimestamp.getTime()).toBeGreaterThanOrEqual(beforeSync);
      expect(cachedTimestamp.getTime()).toBeLessThanOrEqual(afterSync);
    });
  });

  describe('getCachedBalance', () => {
    it('should return cached balance and lastSyncAt from Redis', async () => {
      const syncTime = new Date('2024-01-15T12:00:00Z');
      mockRedisService.get.mockImplementation((key) => {
        if (key === 'treasury:unified_balance')
          return Promise.resolve('3000000000');
        if (key === 'treasury:last_sync')
          return Promise.resolve(syncTime.toISOString());
        return Promise.resolve(null);
      });

      const result = await service.getCachedBalance();

      expect(mockRedisService.get).toHaveBeenCalledWith(
        'treasury:unified_balance',
      );
      expect(mockRedisService.get).toHaveBeenCalledWith('treasury:last_sync');
      expect(result).toEqual({
        balance: '3000000000',
        lastSyncAt: syncTime.toISOString(),
      });
    });

    it('should return default values if cache is empty', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.getCachedBalance();

      expect(result).toEqual({
        balance: '0',
        lastSyncAt: new Date(0).toISOString(),
      });
    });

    it('should default balance to 0 if only balance is missing', async () => {
      mockRedisService.get.mockImplementation((key) => {
        if (key === 'treasury:last_sync')
          return Promise.resolve('2024-01-15T12:00:00Z');
        return Promise.resolve(null);
      });

      const result = await service.getCachedBalance();

      expect(result.balance).toBe('0');
      expect(result.lastSyncAt).toBe('2024-01-15T12:00:00Z');
    });

    it('should default lastSyncAt to epoch if only timestamp is missing', async () => {
      mockRedisService.get.mockImplementation((key) => {
        if (key === 'treasury:unified_balance')
          return Promise.resolve('5000000');
        return Promise.resolve(null);
      });

      const result = await service.getCachedBalance();

      expect(result.balance).toBe('5000000');
      expect(result.lastSyncAt).toBe(new Date(0).toISOString());
    });
  });
});

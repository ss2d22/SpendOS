import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import { SpendRequest } from '../../spend-requests/entities/spend-request.entity';
import { SpendAccount } from '../../spend-accounts/entities/spend-account.entity';
import { TreasuryService } from '../../treasury/services/treasury.service';
import { SpendStatus } from '../../common/enums';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let spendRequestRepository: Repository<SpendRequest>;
  let spendAccountRepository: Repository<SpendAccount>;
  let treasuryService: TreasuryService;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockSpendRequestRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockSpendAccountRepository = {
    find: jest.fn(),
  };

  const mockTreasuryService = {
    getBalance: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(SpendRequest),
          useValue: mockSpendRequestRepository,
        },
        {
          provide: getRepositoryToken(SpendAccount),
          useValue: mockSpendAccountRepository,
        },
        {
          provide: TreasuryService,
          useValue: mockTreasuryService,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    spendRequestRepository = module.get<Repository<SpendRequest>>(
      getRepositoryToken(SpendRequest),
    );
    spendAccountRepository = module.get<Repository<SpendAccount>>(
      getRepositoryToken(SpendAccount),
    );
    treasuryService = module.get<TreasuryService>(TreasuryService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRunway', () => {
    it('should calculate runway days based on available balance and burn rate', async () => {
      const mockBalance = {
        unified: '1000000000', // 1000 USDC (6 decimals)
        committed: '500000000', // 500 USDC
        available: '500000000', // 500 USDC available
        lastSyncAt: new Date().toISOString(),
      };

      mockTreasuryService.getBalance.mockResolvedValue(mockBalance);

      // Mock burn rate calculation: 10 USDC per day
      const mockSpends = [
        {
          amount: '300000000', // 300 USDC over 30 days
          executedAt: new Date(),
        },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockSpends);

      const result = await service.getRunway();

      // Burn rate: 300 / 30 = 10 USDC per day
      // Runway: 500 / 10 = 50 days
      expect(result.days).toBe(50);
      expect(result.amount).toBe('500000000');
      expect(mockTreasuryService.getBalance).toHaveBeenCalled();
    });

    it('should return Infinity days when burn rate is zero', async () => {
      const mockBalance = {
        unified: '1000000000',
        committed: '500000000',
        available: '500000000',
        lastSyncAt: new Date().toISOString(),
      };

      mockTreasuryService.getBalance.mockResolvedValue(mockBalance);
      mockQueryBuilder.getMany.mockResolvedValue([]); // No spends

      const result = await service.getRunway();

      expect(result.days).toBe(Infinity);
      expect(result.amount).toBe('500000000');
    });
  });

  describe('getBurnRate', () => {
    it('should calculate daily and monthly burn rates', async () => {
      const mockSpends = [
        { amount: '300000000', executedAt: new Date() }, // 300 USDC
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockSpends);

      const result = await service.getBurnRate(30);

      // Daily rate: 300 / 30 = 10 USDC
      expect(result.daily).toBe('10000000');
      // Monthly rate: 10 * 30 = 300 USDC
      expect(result.monthly).toBe('300000000');
    });

    it('should use default 30 days if no days parameter provided', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.getBurnRate();

      expect(result.daily).toBe('0');
      expect(result.monthly).toBe('0');
    });

    it('should handle custom day ranges', async () => {
      const mockSpends = [
        { amount: '70000000', executedAt: new Date() }, // 70 USDC over 7 days
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockSpends);

      const result = await service.getBurnRate(7);

      // Daily rate: 70 / 7 = 10 USDC
      expect(result.daily).toBe('10000000');
      // Monthly rate: 10 * 30 = 300 USDC
      expect(result.monthly).toBe('300000000');
    });
  });

  describe('getDepartmentBreakdown', () => {
    it('should return spend breakdown for all active accounts', async () => {
      const mockAccounts = [
        {
          accountId: 1,
          label: 'Engineering',
          periodSpent: '100000000',
          budgetPerPeriod: '500000000',
          closed: false,
        },
        {
          accountId: 2,
          label: 'Marketing',
          periodSpent: '50000000',
          budgetPerPeriod: '200000000',
          closed: false,
        },
      ];

      mockSpendAccountRepository.find.mockResolvedValue(mockAccounts);

      const result = await service.getDepartmentBreakdown();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        accountId: 1,
        label: 'Engineering',
        spent: '100000000',
        budget: '500000000',
      });
      expect(result[1]).toEqual({
        accountId: 2,
        label: 'Marketing',
        spent: '50000000',
        budget: '200000000',
      });
      expect(mockSpendAccountRepository.find).toHaveBeenCalledWith({
        where: { closed: false },
      });
    });

    it('should return empty array when no active accounts exist', async () => {
      mockSpendAccountRepository.find.mockResolvedValue([]);

      const result = await service.getDepartmentBreakdown();

      expect(result).toEqual([]);
    });

    it('should only include non-closed accounts', async () => {
      const mockAccounts = [
        {
          accountId: 1,
          label: 'Engineering',
          periodSpent: '100000000',
          budgetPerPeriod: '500000000',
          closed: false,
        },
      ];

      mockSpendAccountRepository.find.mockResolvedValue(mockAccounts);

      await service.getDepartmentBreakdown();

      expect(mockSpendAccountRepository.find).toHaveBeenCalledWith({
        where: { closed: false },
      });
    });
  });

  describe('calculateBurnRate (private method)', () => {
    it('should query executed spends within date range', async () => {
      const mockSpends = [
        { amount: '100000000', executedAt: new Date() },
        { amount: '200000000', executedAt: new Date() },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockSpends);

      await service.getBurnRate(30);

      expect(
        mockSpendRequestRepository.createQueryBuilder,
      ).toHaveBeenCalledWith('request');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'request.status = :status',
        { status: SpendStatus.EXECUTED },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'request.executedAt >= :startDate',
        expect.objectContaining({ startDate: expect.any(Date) }),
      );
    });

    it('should calculate average daily burn correctly', async () => {
      const mockSpends = [
        { amount: '100000000', executedAt: new Date() },
        { amount: '200000000', executedAt: new Date() },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockSpends);

      const result = await service.getBurnRate(30);

      // Total: 300, Daily: 300 / 30 = 10
      expect(result.daily).toBe('10000000');
    });

    it('should handle zero spends', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.getBurnRate(30);

      expect(result.daily).toBe('0');
      expect(result.monthly).toBe('0');
    });
  });
});

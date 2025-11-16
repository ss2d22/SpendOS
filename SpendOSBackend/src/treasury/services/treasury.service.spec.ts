import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TreasuryService } from './treasury.service';
import { BalanceSyncService } from './balance-sync.service';
import { AlertsService } from '../../alerts/services/alerts.service';
import { TreasuryContractService } from '../../blockchain/services/treasury-contract.service';
import { FundingEvent } from '../entities/funding-event.entity';
import { SpendAccount } from '../../spend-accounts/entities/spend-account.entity';
import { FundingDirection, AlertType, AlertSeverity } from '../../common/enums';
import type {
  InboundFundingEvent,
  AdminTransferredEvent,
  ContractPausedEvent,
  ContractUnpausedEvent,
} from '../../blockchain/interfaces/treasury-events.interface';

describe('TreasuryService', () => {
  let service: TreasuryService;
  let fundingEventRepository: Repository<FundingEvent>;
  let spendAccountRepository: Repository<SpendAccount>;
  let balanceSyncService: BalanceSyncService;
  let alertsService: AlertsService;
  let treasuryContractService: TreasuryContractService;

  const mockFundingEventRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockSpendAccountRepository = {
    find: jest.fn(),
  };

  const mockBalanceSyncService = {
    syncBalance: jest.fn(),
    getCachedBalance: jest.fn(),
  };

  const mockAlertsService = {
    createAlert: jest.fn(),
  };

  const mockTreasuryContractService = {
    recordInboundFunding: jest.fn(),
    pause: jest.fn(),
    unpause: jest.fn(),
    transferAdmin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TreasuryService,
        {
          provide: getRepositoryToken(FundingEvent),
          useValue: mockFundingEventRepository,
        },
        {
          provide: getRepositoryToken(SpendAccount),
          useValue: mockSpendAccountRepository,
        },
        {
          provide: BalanceSyncService,
          useValue: mockBalanceSyncService,
        },
        {
          provide: AlertsService,
          useValue: mockAlertsService,
        },
        {
          provide: TreasuryContractService,
          useValue: mockTreasuryContractService,
        },
      ],
    }).compile();

    service = module.get<TreasuryService>(TreasuryService);
    fundingEventRepository = module.get<Repository<FundingEvent>>(
      getRepositoryToken(FundingEvent),
    );
    spendAccountRepository = module.get<Repository<SpendAccount>>(
      getRepositoryToken(SpendAccount),
    );
    balanceSyncService = module.get<BalanceSyncService>(BalanceSyncService);
    alertsService = module.get<AlertsService>(AlertsService);
    treasuryContractService = module.get<TreasuryContractService>(
      TreasuryContractService,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should trigger initial balance sync', async () => {
      mockBalanceSyncService.syncBalance.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockBalanceSyncService.syncBalance).toHaveBeenCalled();
    });
  });

  describe('handleInboundFunding', () => {
    it('should record inbound funding event', async () => {
      const event: InboundFundingEvent = {
        amount: '1000000000',
        gatewayTxId: 'gw-tx-123',
        blockNumber: 12345,
        txHash: '0x123',
        timestamp: new Date(),
      };

      const mockFundingEvent = {
        id: 'uuid-123',
        direction: FundingDirection.INBOUND,
        amount: '1000000000',
        gatewayTxId: 'gw-tx-123',
        txHash: '0x123',
        createdAt: new Date(),
      };

      mockFundingEventRepository.create.mockReturnValue(mockFundingEvent);
      mockFundingEventRepository.save.mockResolvedValue(mockFundingEvent);

      await service.handleInboundFunding(event);

      expect(mockFundingEventRepository.create).toHaveBeenCalledWith({
        direction: FundingDirection.INBOUND,
        amount: '1000000000',
        gatewayTxId: 'gw-tx-123',
        txHash: '0x123',
      });
      expect(mockFundingEventRepository.save).toHaveBeenCalledWith(
        mockFundingEvent,
      );
    });
  });

  describe('getBalance', () => {
    it('should return unified, committed, and available balances', async () => {
      mockBalanceSyncService.getCachedBalance.mockResolvedValue({
        balance: '1000000000', // 1000 USDC
        lastSyncAt: '2024-01-01T00:00:00Z',
      });

      mockSpendAccountRepository.find.mockResolvedValue([
        {
          accountId: 1,
          budgetPerPeriod: '200000000', // 200 USDC
          closed: false,
        },
        {
          accountId: 2,
          budgetPerPeriod: '300000000', // 300 USDC
          closed: false,
        },
      ]);

      const result = await service.getBalance();

      expect(result.unified).toBe('1000000000');
      expect(result.committed).toBe('500000000'); // 200 + 300
      expect(result.available).toBe('500000000'); // 1000 - 500
      expect(result.lastSyncAt).toBe('2024-01-01T00:00:00Z');
    });

    it('should only include non-closed accounts in committed calculation', async () => {
      mockBalanceSyncService.getCachedBalance.mockResolvedValue({
        balance: '1000000000',
        lastSyncAt: '2024-01-01T00:00:00Z',
      });

      mockSpendAccountRepository.find.mockResolvedValue([
        {
          accountId: 1,
          budgetPerPeriod: '200000000',
          closed: false,
        },
      ]);

      const result = await service.getBalance();

      expect(mockSpendAccountRepository.find).toHaveBeenCalledWith({
        where: { closed: false },
      });
      expect(result.committed).toBe('200000000');
    });

    it('should handle zero committed when no active accounts', async () => {
      mockBalanceSyncService.getCachedBalance.mockResolvedValue({
        balance: '1000000000',
        lastSyncAt: '2024-01-01T00:00:00Z',
      });

      mockSpendAccountRepository.find.mockResolvedValue([]);

      const result = await service.getBalance();

      expect(result.committed).toBe('0');
      expect(result.available).toBe('1000000000');
    });

    it('should handle negative available balance when over-committed', async () => {
      mockBalanceSyncService.getCachedBalance.mockResolvedValue({
        balance: '100000000', // 100 USDC
        lastSyncAt: '2024-01-01T00:00:00Z',
      });

      mockSpendAccountRepository.find.mockResolvedValue([
        {
          accountId: 1,
          budgetPerPeriod: '200000000', // 200 USDC
          closed: false,
        },
      ]);

      const result = await service.getBalance();

      expect(result.committed).toBe('200000000');
      expect(result.available).toBe('-100000000'); // Negative balance
    });
  });

  describe('getFundingHistory', () => {
    it('should return funding events ordered by createdAt DESC', async () => {
      const mockEvents = [
        {
          id: '1',
          direction: FundingDirection.INBOUND,
          amount: '1000000000',
          createdAt: new Date('2024-01-02'),
        },
        {
          id: '2',
          direction: FundingDirection.INBOUND,
          amount: '500000000',
          createdAt: new Date('2024-01-01'),
        },
      ];

      mockFundingEventRepository.find.mockResolvedValue(mockEvents);

      const result = await service.getFundingHistory();

      expect(mockFundingEventRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        take: 50,
      });
      expect(result).toEqual(mockEvents);
    });

    it('should use default limit of 50', async () => {
      mockFundingEventRepository.find.mockResolvedValue([]);

      await service.getFundingHistory();

      expect(mockFundingEventRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        take: 50,
      });
    });

    it('should use custom limit when provided', async () => {
      mockFundingEventRepository.find.mockResolvedValue([]);

      await service.getFundingHistory(100);

      expect(mockFundingEventRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        take: 100,
      });
    });
  });

  describe('handleAdminTransferred', () => {
    it('should create critical alert when admin is transferred', async () => {
      const event: AdminTransferredEvent = {
        previousAdmin: '0xOldAdmin',
        newAdmin: '0xNewAdmin',
        blockNumber: 12345,
        txHash: '0xtx123',
        timestamp: new Date(),
      };

      mockAlertsService.createAlert.mockResolvedValue({
        id: 'alert-123',
        type: AlertType.ADMIN_TRANSFERRED,
      });

      await service.handleAdminTransferred(event);

      expect(mockAlertsService.createAlert).toHaveBeenCalledWith(
        AlertType.ADMIN_TRANSFERRED,
        'Treasury admin transferred from 0xOldAdmin to 0xNewAdmin',
        AlertSeverity.CRITICAL,
        undefined,
        {
          previousAdmin: '0xOldAdmin',
          newAdmin: '0xNewAdmin',
          txHash: '0xtx123',
        },
      );
    });
  });

  describe('handleContractPaused', () => {
    it('should create critical alert when contract is paused', async () => {
      const event: ContractPausedEvent = {
        blockNumber: 12345,
        txHash: '0xtx456',
        timestamp: new Date('2024-01-01T12:00:00Z'),
      };

      mockAlertsService.createAlert.mockResolvedValue({
        id: 'alert-456',
        type: AlertType.CONTRACT_PAUSED,
      });

      await service.handleContractPaused(event);

      expect(mockAlertsService.createAlert).toHaveBeenCalledWith(
        AlertType.CONTRACT_PAUSED,
        'Treasury contract has been paused - all operations are disabled',
        AlertSeverity.CRITICAL,
        undefined,
        {
          txHash: '0xtx456',
          pausedAt: event.timestamp,
        },
      );
    });
  });

  describe('handleContractUnpaused', () => {
    it('should log when contract is unpaused without creating alert', async () => {
      const event: ContractUnpausedEvent = {
        blockNumber: 12345,
        txHash: '0xtx789',
        timestamp: new Date(),
      };

      await service.handleContractUnpaused(event);

      // Should not create an alert for unpause
      expect(mockAlertsService.createAlert).not.toHaveBeenCalled();
    });
  });

  // ==================== NEW WRITE OPERATIONS ====================

  describe('fundTreasury', () => {
    it('should fund treasury successfully', async () => {
      mockTreasuryContractService.recordInboundFunding.mockResolvedValue(
        '0xtxhash123',
      );

      const result = await service.fundTreasury('1000000000', 'gw-tx-123');

      expect(mockTreasuryContractService.recordInboundFunding).toHaveBeenCalledWith(
        '1000000000',
        'gw-tx-123',
      );
      expect(result).toBe('0xtxhash123');
    });

    it('should propagate errors from treasury contract service', async () => {
      mockTreasuryContractService.recordInboundFunding.mockRejectedValue(
        new Error('Funding failed'),
      );

      await expect(
        service.fundTreasury('1000000000', 'gw-tx-123'),
      ).rejects.toThrow('Funding failed');
    });

    it('should handle different amounts and gateway transaction IDs', async () => {
      mockTreasuryContractService.recordInboundFunding.mockResolvedValue(
        '0xtxhash456',
      );

      const result = await service.fundTreasury('500000000', 'gw-tx-456');

      expect(mockTreasuryContractService.recordInboundFunding).toHaveBeenCalledWith(
        '500000000',
        'gw-tx-456',
      );
      expect(result).toBe('0xtxhash456');
    });
  });

  describe('pauseContract', () => {
    it('should pause contract successfully', async () => {
      mockTreasuryContractService.pause.mockResolvedValue('0xtxhash789');

      const result = await service.pauseContract();

      expect(mockTreasuryContractService.pause).toHaveBeenCalled();
      expect(result).toBe('0xtxhash789');
    });

    it('should propagate errors from treasury contract service', async () => {
      mockTreasuryContractService.pause.mockRejectedValue(
        new Error('Pause failed'),
      );

      await expect(service.pauseContract()).rejects.toThrow('Pause failed');
    });
  });

  describe('unpauseContract', () => {
    it('should unpause contract successfully', async () => {
      mockTreasuryContractService.unpause.mockResolvedValue('0xtxhash101');

      const result = await service.unpauseContract();

      expect(mockTreasuryContractService.unpause).toHaveBeenCalled();
      expect(result).toBe('0xtxhash101');
    });

    it('should propagate errors from treasury contract service', async () => {
      mockTreasuryContractService.unpause.mockRejectedValue(
        new Error('Unpause failed'),
      );

      await expect(service.unpauseContract()).rejects.toThrow('Unpause failed');
    });
  });

  describe('transferAdmin', () => {
    it('should transfer admin rights successfully', async () => {
      mockTreasuryContractService.transferAdmin.mockResolvedValue(
        '0xtxhash202',
      );

      const result = await service.transferAdmin('0xNewAdmin');

      expect(mockTreasuryContractService.transferAdmin).toHaveBeenCalledWith(
        '0xNewAdmin',
      );
      expect(result).toBe('0xtxhash202');
    });

    it('should propagate errors from treasury contract service', async () => {
      mockTreasuryContractService.transferAdmin.mockRejectedValue(
        new Error('Transfer failed'),
      );

      await expect(service.transferAdmin('0xNewAdmin')).rejects.toThrow(
        'Transfer failed',
      );
    });

    it('should handle different admin addresses', async () => {
      mockTreasuryContractService.transferAdmin.mockResolvedValue(
        '0xtxhash303',
      );

      const result = await service.transferAdmin('0xAnotherAdmin');

      expect(mockTreasuryContractService.transferAdmin).toHaveBeenCalledWith(
        '0xAnotherAdmin',
      );
      expect(result).toBe('0xtxhash303');
    });
  });
});

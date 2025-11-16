import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TreasuryService } from './treasury.service';
import { BalanceSyncService } from './balance-sync.service';
import { AlertsService } from '../../alerts/services/alerts.service';
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
});

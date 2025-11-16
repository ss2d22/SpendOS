import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpendAccountsService } from './spend-accounts.service';
import { SpendAccount } from '../entities/spend-account.entity';
import { TreasuryContractService } from '../../blockchain/services/treasury-contract.service';
import { AlertsService } from '../../alerts/services/alerts.service';
import { AlertType, AlertSeverity } from '../../common/enums';
import type {
  SpendAccountCreatedEvent,
  SpendAccountUpdatedEvent,
  SpendAccountFrozenEvent,
  SpendAccountUnfrozenEvent,
  SpendAccountClosedEvent,
} from '../../blockchain/interfaces/treasury-events.interface';

describe('SpendAccountsService', () => {
  let service: SpendAccountsService;
  let repository: Repository<SpendAccount>;
  let treasuryContractService: TreasuryContractService;
  let alertsService: AlertsService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockTreasuryContractService = {
    getAccount: jest.fn(),
  };

  const mockAlertsService = {
    createAlert: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpendAccountsService,
        {
          provide: getRepositoryToken(SpendAccount),
          useValue: mockRepository,
        },
        {
          provide: TreasuryContractService,
          useValue: mockTreasuryContractService,
        },
        {
          provide: AlertsService,
          useValue: mockAlertsService,
        },
      ],
    }).compile();

    service = module.get<SpendAccountsService>(SpendAccountsService);
    repository = module.get<Repository<SpendAccount>>(
      getRepositoryToken(SpendAccount),
    );
    treasuryContractService = module.get<TreasuryContractService>(
      TreasuryContractService,
    );
    alertsService = module.get<AlertsService>(AlertsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleAccountCreated', () => {
    it('should fetch account data and create database entry', async () => {
      const event: SpendAccountCreatedEvent = {
        accountId: 1,
        ownerAddress: '0xOwner',
        approverAddress: '0xApprover',
        label: 'Engineering',
        budgetPerPeriod: '1000000000',
        periodDuration: 2592000,
        perTxLimit: '100000000',
        dailyLimit: '200000000',
        approvalThreshold: '50000000',
        allowedChains: [1, 137],
        blockNumber: 12345,
        txHash: '0xtx123',
        timestamp: new Date(),
      };

      const mockAccountData = {
        owner: '0xOwner',
        approver: '0xApprover',
        label: 'Engineering',
        budgetPerPeriod: BigInt('1000000000'),
        periodDuration: BigInt(2592000),
        perTxLimit: BigInt('100000000'),
        dailyLimit: BigInt('200000000'),
        approvalThreshold: BigInt('50000000'),
        periodSpent: BigInt(0),
        periodReserved: BigInt(0),
        dailySpent: BigInt(0),
        dailyReserved: BigInt(0),
        periodStart: BigInt(Math.floor(Date.now() / 1000)),
        dailyResetAt: BigInt(Math.floor(Date.now() / 1000)),
        frozen: false,
        closed: false,
        allowedChains: [BigInt(1), BigInt(137)],
        autoTopupMinBalance: null,
        autoTopupTargetBalance: null,
      };

      mockTreasuryContractService.getAccount.mockResolvedValue(mockAccountData);
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      await service.handleAccountCreated(event);

      expect(mockTreasuryContractService.getAccount).toHaveBeenCalledWith(1);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 1,
          ownerAddress: '0xowner',
          approverAddress: '0xapprover',
          label: 'Engineering',
          budgetPerPeriod: '1000000000',
          frozen: false,
          closed: false,
          allowedChains: ['1', '137'],
        }),
      );
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should handle auto-topup settings when present', async () => {
      const event: SpendAccountCreatedEvent = {
        accountId: 2,
        ownerAddress: '0xOwner',
        approverAddress: '0xApprover',
        label: 'Marketing',
        budgetPerPeriod: '1000000000',
        periodDuration: 2592000,
        perTxLimit: '100000000',
        dailyLimit: '200000000',
        approvalThreshold: '50000000',
        allowedChains: [1],
        blockNumber: 12345,
        txHash: '0xtx123',
        timestamp: new Date(),
      };

      const mockAccountData = {
        owner: '0xOwner',
        approver: '0xApprover',
        label: 'Marketing',
        budgetPerPeriod: BigInt('1000000000'),
        periodDuration: BigInt(2592000),
        perTxLimit: BigInt('100000000'),
        dailyLimit: BigInt('200000000'),
        approvalThreshold: BigInt('50000000'),
        periodSpent: BigInt(0),
        periodReserved: BigInt(0),
        dailySpent: BigInt(0),
        dailyReserved: BigInt(0),
        periodStart: BigInt(Math.floor(Date.now() / 1000)),
        dailyResetAt: BigInt(Math.floor(Date.now() / 1000)),
        frozen: false,
        closed: false,
        allowedChains: [BigInt(1)],
        autoTopupMinBalance: BigInt('10000000'),
        autoTopupTargetBalance: BigInt('50000000'),
      };

      mockTreasuryContractService.getAccount.mockResolvedValue(mockAccountData);
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      await service.handleAccountCreated(event);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          autoTopupMinBalance: '10000000',
          autoTopupTargetBalance: '50000000',
        }),
      );
    });
  });

  describe('handleAccountUpdated', () => {
    it('should fetch updated account data and update database', async () => {
      const event: SpendAccountUpdatedEvent = {
        accountId: 1,
        blockNumber: 12346,
        txHash: '0xtx124',
        timestamp: new Date(),
      };

      const mockAccountData = {
        owner: '0xNewOwner',
        approver: '0xNewApprover',
        label: 'Engineering - Updated',
        budgetPerPeriod: BigInt('2000000000'),
        periodDuration: BigInt(2592000),
        perTxLimit: BigInt('150000000'),
        dailyLimit: BigInt('300000000'),
        approvalThreshold: BigInt('75000000'),
        allowedChains: [BigInt(1), BigInt(137), BigInt(42161)],
        autoTopupMinBalance: null,
        autoTopupTargetBalance: null,
      };

      mockTreasuryContractService.getAccount.mockResolvedValue(mockAccountData);
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.handleAccountUpdated(event);

      expect(mockTreasuryContractService.getAccount).toHaveBeenCalledWith(1);
      expect(mockRepository.update).toHaveBeenCalledWith(
        { accountId: 1 },
        expect.objectContaining({
          ownerAddress: '0xnewowner',
          approverAddress: '0xnewapprover',
          label: 'Engineering - Updated',
          budgetPerPeriod: '2000000000',
          allowedChains: ['1', '137', '42161'],
        }),
      );
    });
  });

  describe('handleAccountFrozen', () => {
    it('should update frozen flag and create alert', async () => {
      const event: SpendAccountFrozenEvent = {
        accountId: 1,
        blockNumber: 12347,
        txHash: '0xtx125',
        timestamp: new Date(),
      };

      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockAlertsService.createAlert.mockResolvedValue({});

      await service.handleAccountFrozen(event);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { accountId: 1 },
        { frozen: true },
      );

      expect(mockAlertsService.createAlert).toHaveBeenCalledWith(
        AlertType.ACCOUNT_FROZEN,
        'Spend account 1 has been frozen',
        AlertSeverity.WARNING,
        1,
      );
    });
  });

  describe('handleAccountUnfrozen', () => {
    it('should update frozen flag to false', async () => {
      const event: SpendAccountUnfrozenEvent = {
        accountId: 1,
        blockNumber: 12348,
        txHash: '0xtx126',
        timestamp: new Date(),
      };

      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.handleAccountUnfrozen(event);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { accountId: 1 },
        { frozen: false },
      );
    });
  });

  describe('handleAccountClosed', () => {
    it('should update closed flag and create alert', async () => {
      const event: SpendAccountClosedEvent = {
        accountId: 1,
        blockNumber: 12349,
        txHash: '0xtx127',
        timestamp: new Date(),
      };

      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockAlertsService.createAlert.mockResolvedValue({});

      await service.handleAccountClosed(event);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { accountId: 1 },
        { closed: true },
      );

      expect(mockAlertsService.createAlert).toHaveBeenCalledWith(
        AlertType.ACCOUNT_CLOSED,
        'Spend account 1 has been closed',
        AlertSeverity.INFO,
        1,
      );
    });
  });

  describe('findAll', () => {
    it('should return all accounts ordered by accountId', async () => {
      const mockAccounts = [
        { accountId: 1, label: 'Engineering' },
        { accountId: 2, label: 'Marketing' },
      ];

      mockRepository.find.mockResolvedValue(mockAccounts);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { accountId: 'ASC' },
      });
      expect(result).toEqual(mockAccounts);
    });
  });

  describe('findOne', () => {
    it('should find account by accountId', async () => {
      const mockAccount = { accountId: 1, label: 'Engineering' };

      mockRepository.findOne.mockResolvedValue(mockAccount);

      const result = await service.findOne(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { accountId: 1 },
      });
      expect(result).toEqual(mockAccount);
    });

    it('should return null if account not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe('findByOwner', () => {
    it('should find accounts by owner address (lowercase)', async () => {
      const mockAccounts = [
        { accountId: 1, ownerAddress: '0xowner1' },
        { accountId: 2, ownerAddress: '0xowner1' },
      ];

      mockRepository.find.mockResolvedValue(mockAccounts);

      const result = await service.findByOwner('0xOWNER1');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { ownerAddress: '0xowner1' },
        order: { accountId: 'ASC' },
      });
      expect(result).toEqual(mockAccounts);
    });
  });

  describe('findByApprover', () => {
    it('should find accounts by approver address (lowercase)', async () => {
      const mockAccounts = [
        { accountId: 3, approverAddress: '0xapprover1' },
        { accountId: 4, approverAddress: '0xapprover1' },
      ];

      mockRepository.find.mockResolvedValue(mockAccounts);

      const result = await service.findByApprover('0xAPPROVER1');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { approverAddress: '0xapprover1' },
        order: { accountId: 'ASC' },
      });
      expect(result).toEqual(mockAccounts);
    });
  });
});

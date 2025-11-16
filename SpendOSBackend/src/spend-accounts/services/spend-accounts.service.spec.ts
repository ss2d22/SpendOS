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
    createSpendAccount: jest.fn(),
    updateSpendAccount: jest.fn(),
    freezeAccount: jest.fn(),
    unfreezeAccount: jest.fn(),
    closeAccount: jest.fn(),
    updateAllowedChains: jest.fn(),
    setAutoTopupConfig: jest.fn(),
    autoTopup: jest.fn(),
    sweepAccount: jest.fn(),
    resetPeriod: jest.fn(),
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

  // ==================== NEW WRITE OPERATIONS ====================

  describe('createAccount', () => {
    it('should create spend account and return result', async () => {
      const mockResult = {
        accountId: 5,
        transactionHash: '0xtxhash123',
      };

      mockTreasuryContractService.createSpendAccount.mockResolvedValue(
        mockResult,
      );

      const result = await service.createAccount(
        '0xOwner',
        'Engineering',
        '1000000000',
        2592000,
        '100000000',
        '200000000',
        '50000000',
        '0xApprover',
        [1, 137],
      );

      expect(mockTreasuryContractService.createSpendAccount).toHaveBeenCalledWith(
        '0xOwner',
        'Engineering',
        '1000000000',
        2592000,
        '100000000',
        '200000000', // dailyLimit from the test
        '50000000',
        '0xApprover',
        [1, 137],
      );
      expect(result).toEqual(mockResult);
    });

    it('should use provided dailyLimit when specified', async () => {
      mockTreasuryContractService.createSpendAccount.mockResolvedValue({
        accountId: 5,
        transactionHash: '0xtxhash123',
      });

      await service.createAccount(
        '0xOwner',
        'Engineering',
        '1000000000',
        2592000,
        '100000000',
        '300000000', // custom dailyLimit
        '50000000',
        '0xApprover',
        [1],
      );

      expect(mockTreasuryContractService.createSpendAccount).toHaveBeenCalledWith(
        '0xOwner',
        'Engineering',
        '1000000000',
        2592000,
        '100000000',
        '300000000',
        '50000000',
        '0xApprover',
        [1],
      );
    });

    it('should propagate errors from treasury contract service', async () => {
      mockTreasuryContractService.createSpendAccount.mockRejectedValue(
        new Error('Contract error'),
      );

      await expect(
        service.createAccount(
          '0xOwner',
          'Engineering',
          '1000000000',
          2592000,
          '100000000',
          '200000000',
          '50000000',
          '0xApprover',
          [1],
        ),
      ).rejects.toThrow('Contract error');
    });
  });

  describe('updateAccount', () => {
    it('should update spend account successfully', async () => {
      mockTreasuryContractService.updateSpendAccount.mockResolvedValue(
        '0xtxhash456',
      );

      const result = await service.updateAccount(
        1,
        '2000000000',
        '150000000',
        '300000000',
        '75000000',
        '0xNewApprover',
      );

      expect(mockTreasuryContractService.updateSpendAccount).toHaveBeenCalledWith(
        1,
        '2000000000',
        '150000000',
        '300000000',
        '75000000',
        '0xNewApprover',
      );
      expect(result).toBe('0xtxhash456');
    });

    it('should handle partial updates with empty strings', async () => {
      mockTreasuryContractService.updateSpendAccount.mockResolvedValue(
        '0xtxhash456',
      );

      await service.updateAccount(1, '2000000000');

      expect(mockTreasuryContractService.updateSpendAccount).toHaveBeenCalledWith(
        1,
        '2000000000',
        '',
        '',
        '',
        '',
      );
    });

    it('should propagate errors from treasury contract service', async () => {
      mockTreasuryContractService.updateSpendAccount.mockRejectedValue(
        new Error('Update failed'),
      );

      await expect(service.updateAccount(1, '2000000000')).rejects.toThrow(
        'Update failed',
      );
    });
  });

  describe('freezeAccount', () => {
    it('should freeze account successfully', async () => {
      mockTreasuryContractService.freezeAccount.mockResolvedValue(
        '0xtxhash789',
      );

      const result = await service.freezeAccount(1);

      expect(mockTreasuryContractService.freezeAccount).toHaveBeenCalledWith(1);
      expect(result).toBe('0xtxhash789');
    });

    it('should propagate errors from treasury contract service', async () => {
      mockTreasuryContractService.freezeAccount.mockRejectedValue(
        new Error('Freeze failed'),
      );

      await expect(service.freezeAccount(1)).rejects.toThrow('Freeze failed');
    });
  });

  describe('unfreezeAccount', () => {
    it('should unfreeze account successfully', async () => {
      mockTreasuryContractService.unfreezeAccount.mockResolvedValue(
        '0xtxhash101',
      );

      const result = await service.unfreezeAccount(1);

      expect(mockTreasuryContractService.unfreezeAccount).toHaveBeenCalledWith(1);
      expect(result).toBe('0xtxhash101');
    });

    it('should propagate errors from treasury contract service', async () => {
      mockTreasuryContractService.unfreezeAccount.mockRejectedValue(
        new Error('Unfreeze failed'),
      );

      await expect(service.unfreezeAccount(1)).rejects.toThrow(
        'Unfreeze failed',
      );
    });
  });

  describe('closeAccount', () => {
    it('should close account successfully', async () => {
      mockTreasuryContractService.closeAccount.mockResolvedValue(
        '0xtxhash202',
      );

      const result = await service.closeAccount(1);

      expect(mockTreasuryContractService.closeAccount).toHaveBeenCalledWith(1);
      expect(result).toBe('0xtxhash202');
    });

    it('should propagate errors from treasury contract service', async () => {
      mockTreasuryContractService.closeAccount.mockRejectedValue(
        new Error('Close failed'),
      );

      await expect(service.closeAccount(1)).rejects.toThrow('Close failed');
    });
  });

  describe('updateAllowedChains', () => {
    it('should update allowed chains successfully', async () => {
      mockTreasuryContractService.updateAllowedChains.mockResolvedValue(
        '0xtxhash303',
      );

      const result = await service.updateAllowedChains(1, [1, 137, 42161]);

      expect(mockTreasuryContractService.updateAllowedChains).toHaveBeenCalledWith(
        1,
        [1, 137, 42161],
      );
      expect(result).toBe('0xtxhash303');
    });

    it('should propagate errors from treasury contract service', async () => {
      mockTreasuryContractService.updateAllowedChains.mockRejectedValue(
        new Error('Chain update failed'),
      );

      await expect(service.updateAllowedChains(1, [1])).rejects.toThrow(
        'Chain update failed',
      );
    });
  });

  describe('configureAutoTopup', () => {
    it('should configure auto-topup successfully', async () => {
      mockTreasuryContractService.setAutoTopupConfig.mockResolvedValue(
        '0xtxhash404',
      );

      const result = await service.configureAutoTopup(
        1,
        '10000000',
        '50000000',
      );

      expect(mockTreasuryContractService.setAutoTopupConfig).toHaveBeenCalledWith(
        1,
        '10000000',
        '50000000',
      );
      expect(result).toBe('0xtxhash404');
    });

    it('should propagate errors from treasury contract service', async () => {
      mockTreasuryContractService.setAutoTopupConfig.mockRejectedValue(
        new Error('Config failed'),
      );

      await expect(
        service.configureAutoTopup(1, '10000000', '50000000'),
      ).rejects.toThrow('Config failed');
    });
  });

  describe('executeAutoTopup', () => {
    it('should execute auto-topup successfully', async () => {
      mockTreasuryContractService.autoTopup.mockResolvedValue('0xtxhash505');

      const result = await service.executeAutoTopup(1);

      expect(mockTreasuryContractService.autoTopup).toHaveBeenCalledWith(1);
      expect(result).toBe('0xtxhash505');
    });

    it('should propagate errors from treasury contract service', async () => {
      mockTreasuryContractService.autoTopup.mockRejectedValue(
        new Error('Topup failed'),
      );

      await expect(service.executeAutoTopup(1)).rejects.toThrow('Topup failed');
    });
  });

  describe('sweepAccount', () => {
    it('should sweep account successfully', async () => {
      mockTreasuryContractService.sweepAccount.mockResolvedValue(
        '0xtxhash606',
      );

      const result = await service.sweepAccount(1);

      expect(mockTreasuryContractService.sweepAccount).toHaveBeenCalledWith(1);
      expect(result).toBe('0xtxhash606');
    });

    it('should propagate errors from treasury contract service', async () => {
      mockTreasuryContractService.sweepAccount.mockRejectedValue(
        new Error('Sweep failed'),
      );

      await expect(service.sweepAccount(1)).rejects.toThrow('Sweep failed');
    });
  });

  describe('resetPeriod', () => {
    it('should reset period successfully', async () => {
      mockTreasuryContractService.resetPeriod.mockResolvedValue('0xtxhash707');

      const result = await service.resetPeriod(1);

      expect(mockTreasuryContractService.resetPeriod).toHaveBeenCalledWith(1);
      expect(result).toBe('0xtxhash707');
    });

    it('should propagate errors from treasury contract service', async () => {
      mockTreasuryContractService.resetPeriod.mockRejectedValue(
        new Error('Reset failed'),
      );

      await expect(service.resetPeriod(1)).rejects.toThrow('Reset failed');
    });
  });
});

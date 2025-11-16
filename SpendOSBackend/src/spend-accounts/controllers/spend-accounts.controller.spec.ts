import { Test, TestingModule } from '@nestjs/testing';
import { SpendAccountsController } from './spend-accounts.controller';
import { SpendAccountsService } from '../services/spend-accounts.service';

describe('SpendAccountsController', () => {
  let controller: SpendAccountsController;
  let service: SpendAccountsService;

  const mockSpendAccountsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByOwner: jest.fn(),
    findByApprover: jest.fn(),
    createAccount: jest.fn(),
    updateAccount: jest.fn(),
    freezeAccount: jest.fn(),
    unfreezeAccount: jest.fn(),
    closeAccount: jest.fn(),
    updateAllowedChains: jest.fn(),
    configureAutoTopup: jest.fn(),
    executeAutoTopup: jest.fn(),
    sweepAccount: jest.fn(),
    resetPeriod: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpendAccountsController],
      providers: [
        {
          provide: SpendAccountsService,
          useValue: mockSpendAccountsService,
        },
      ],
    }).compile();

    controller = module.get<SpendAccountsController>(SpendAccountsController);
    service = module.get<SpendAccountsService>(SpendAccountsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all spend accounts', async () => {
      const mockAccounts = [
        { accountId: 1, label: 'Engineering' },
        { accountId: 2, label: 'Marketing' },
      ];

      mockSpendAccountsService.findAll.mockResolvedValue(mockAccounts);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockAccounts);
    });
  });

  describe('findOne', () => {
    it('should return single account by accountId', async () => {
      const mockAccount = { accountId: 1, label: 'Engineering' };

      mockSpendAccountsService.findOne.mockResolvedValue(mockAccount);

      const result = await controller.findOne(1);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockAccount);
    });
  });

  describe('findMine', () => {
    it('should return accounts where user is owner or approver', async () => {
      const mockUser = { address: '0xuser' };
      const mockOwnerAccounts = [{ accountId: 1 }];
      const mockApproverAccounts = [{ accountId: 2 }];

      mockSpendAccountsService.findByOwner.mockResolvedValue(mockOwnerAccounts);
      mockSpendAccountsService.findByApprover.mockResolvedValue(
        mockApproverAccounts,
      );

      const result = await controller.findMine(mockUser);

      expect(service.findByOwner).toHaveBeenCalledWith('0xuser');
      expect(service.findByApprover).toHaveBeenCalledWith('0xuser');
      expect(result).toEqual({
        owned: mockOwnerAccounts,
        approver: mockApproverAccounts,
      });
    });
  });

  // ==================== NEW WRITE OPERATIONS ====================

  describe('create', () => {
    it('should create spend account successfully', async () => {
      const createDto = {
        owner: '0xOwner',
        label: 'Engineering',
        budgetPerPeriod: '1000000000',
        periodDuration: 2592000,
        perTxLimit: '100000000',
        dailyLimit: '200000000',
        approvalThreshold: '50000000',
        approver: '0xApprover',
        allowedChains: [1, 137],
      };

      const mockResult = {
        accountId: 5,
        transactionHash: '0xtxhash123',
      };

      mockSpendAccountsService.createAccount.mockResolvedValue(mockResult);

      const result = await controller.create(createDto);

      expect(service.createAccount).toHaveBeenCalledWith(
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
      expect(result).toEqual(mockResult);
    });

    it('should use provided dailyLimit when specified', async () => {
      const createDto = {
        owner: '0xOwner',
        label: 'Marketing',
        budgetPerPeriod: '1000000000',
        periodDuration: 2592000,
        perTxLimit: '100000000',
        dailyLimit: '300000000',
        approvalThreshold: '50000000',
        approver: '0xApprover',
        allowedChains: [1],
      };

      mockSpendAccountsService.createAccount.mockResolvedValue({
        accountId: 6,
        transactionHash: '0xtxhash456',
      });

      await controller.create(createDto);

      expect(service.createAccount).toHaveBeenCalledWith(
        '0xOwner',
        'Marketing',
        '1000000000',
        2592000,
        '100000000',
        '300000000',
        '50000000',
        '0xApprover',
        [1],
      );
    });
  });

  describe('update', () => {
    it('should update spend account successfully', async () => {
      const updateDto = {
        budgetPerPeriod: '2000000000',
        perTxLimit: '150000000',
        dailyLimit: '300000000',
        approvalThreshold: '75000000',
        approver: '0xNewApprover',
      };

      mockSpendAccountsService.updateAccount.mockResolvedValue('0xtxhash789');

      const result = await controller.update(1, updateDto);

      expect(service.updateAccount).toHaveBeenCalledWith(
        1,
        '2000000000',
        '150000000',
        '300000000',
        '75000000',
        '0xNewApprover',
      );
      expect(result).toEqual({ transactionHash: '0xtxhash789' });
    });

    it('should handle partial updates', async () => {
      const updateDto = {
        budgetPerPeriod: '2000000000',
      };

      mockSpendAccountsService.updateAccount.mockResolvedValue('0xtxhash101');

      await controller.update(1, updateDto);

      expect(service.updateAccount).toHaveBeenCalledWith(
        1,
        '2000000000',
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });
  });

  describe('remove', () => {
    it('should close account successfully', async () => {
      mockSpendAccountsService.closeAccount.mockResolvedValue('0xtxhash202');

      const result = await controller.remove(1);

      expect(service.closeAccount).toHaveBeenCalledWith(1);
      expect(result).toEqual({ transactionHash: '0xtxhash202' });
    });
  });

  describe('freeze', () => {
    it('should freeze account successfully', async () => {
      mockSpendAccountsService.freezeAccount.mockResolvedValue('0xtxhash303');

      const result = await controller.freeze(1);

      expect(service.freezeAccount).toHaveBeenCalledWith(1);
      expect(result).toEqual({ transactionHash: '0xtxhash303' });
    });
  });

  describe('unfreeze', () => {
    it('should unfreeze account successfully', async () => {
      mockSpendAccountsService.unfreezeAccount.mockResolvedValue(
        '0xtxhash404',
      );

      const result = await controller.unfreeze(1);

      expect(service.unfreezeAccount).toHaveBeenCalledWith(1);
      expect(result).toEqual({ transactionHash: '0xtxhash404' });
    });
  });

  describe('sweep', () => {
    it('should sweep account successfully', async () => {
      mockSpendAccountsService.sweepAccount.mockResolvedValue('0xtxhash505');

      const result = await controller.sweep(1);

      expect(service.sweepAccount).toHaveBeenCalledWith(1);
      expect(result).toEqual({ transactionHash: '0xtxhash505' });
    });
  });

  describe('resetPeriod', () => {
    it('should reset period successfully', async () => {
      mockSpendAccountsService.resetPeriod.mockResolvedValue('0xtxhash606');

      const result = await controller.resetPeriod(1);

      expect(service.resetPeriod).toHaveBeenCalledWith(1);
      expect(result).toEqual({ transactionHash: '0xtxhash606' });
    });
  });

  describe('updateAllowedChains', () => {
    it('should update allowed chains successfully', async () => {
      const dto = {
        allowedChains: [1, 137, 42161],
      };

      mockSpendAccountsService.updateAllowedChains.mockResolvedValue(
        '0xtxhash707',
      );

      const result = await controller.updateAllowedChains(1, dto);

      expect(service.updateAllowedChains).toHaveBeenCalledWith(1, [
        1, 137, 42161,
      ]);
      expect(result).toEqual({ transactionHash: '0xtxhash707' });
    });

    it('should handle single chain', async () => {
      const dto = {
        allowedChains: [1],
      };

      mockSpendAccountsService.updateAllowedChains.mockResolvedValue(
        '0xtxhash808',
      );

      await controller.updateAllowedChains(1, dto);

      expect(service.updateAllowedChains).toHaveBeenCalledWith(1, [1]);
    });
  });

  describe('configureAutoTopup', () => {
    it('should configure auto-topup successfully', async () => {
      const dto = {
        minBalance: '10000000',
        targetBalance: '50000000',
      };

      mockSpendAccountsService.configureAutoTopup.mockResolvedValue(
        '0xtxhash909',
      );

      const result = await controller.configureAutoTopup(1, dto);

      expect(service.configureAutoTopup).toHaveBeenCalledWith(
        1,
        '10000000',
        '50000000',
      );
      expect(result).toEqual({ transactionHash: '0xtxhash909' });
    });

    it('should handle different balance thresholds', async () => {
      const dto = {
        minBalance: '5000000',
        targetBalance: '25000000',
      };

      mockSpendAccountsService.configureAutoTopup.mockResolvedValue(
        '0xtxhash1010',
      );

      await controller.configureAutoTopup(2, dto);

      expect(service.configureAutoTopup).toHaveBeenCalledWith(
        2,
        '5000000',
        '25000000',
      );
    });
  });

  describe('executeAutoTopup', () => {
    it('should execute auto-topup successfully', async () => {
      mockSpendAccountsService.executeAutoTopup.mockResolvedValue(
        '0xtxhash1111',
      );

      const result = await controller.executeAutoTopup(1);

      expect(service.executeAutoTopup).toHaveBeenCalledWith(1);
      expect(result).toEqual({ transactionHash: '0xtxhash1111' });
    });

    it('should handle different account IDs', async () => {
      mockSpendAccountsService.executeAutoTopup.mockResolvedValue(
        '0xtxhash1212',
      );

      const result = await controller.executeAutoTopup(5);

      expect(service.executeAutoTopup).toHaveBeenCalledWith(5);
      expect(result).toEqual({ transactionHash: '0xtxhash1212' });
    });
  });
});

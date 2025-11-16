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
});

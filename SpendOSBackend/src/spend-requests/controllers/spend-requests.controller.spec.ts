import { Test, TestingModule } from '@nestjs/testing';
import { SpendRequestsController } from './spend-requests.controller';
import { SpendRequestsService } from '../services/spend-requests.service';
import { SpendStatus } from '../../common/enums';

describe('SpendRequestsController', () => {
  let controller: SpendRequestsController;
  let service: SpendRequestsService;

  const mockSpendRequestsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByAccount: jest.fn(),
    createRequest: jest.fn(),
    approveRequest: jest.fn(),
    rejectRequest: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpendRequestsController],
      providers: [
        {
          provide: SpendRequestsService,
          useValue: mockSpendRequestsService,
        },
      ],
    }).compile();

    controller = module.get<SpendRequestsController>(SpendRequestsController);
    service = module.get<SpendRequestsService>(SpendRequestsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all spend requests without filters', async () => {
      const mockRequests = [
        { requestId: 1, status: SpendStatus.APPROVED },
        { requestId: 2, status: SpendStatus.PENDING_APPROVAL },
      ];

      mockSpendRequestsService.findAll.mockResolvedValue(mockRequests);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockRequests);
    });

    it('should filter by accountId', async () => {
      mockSpendRequestsService.findAll.mockResolvedValue([]);

      await controller.findAll(10);

      expect(service.findAll).toHaveBeenCalledWith(10, undefined, undefined);
    });

    it('should filter by status', async () => {
      mockSpendRequestsService.findAll.mockResolvedValue([]);

      await controller.findAll(undefined, SpendStatus.APPROVED);

      expect(service.findAll).toHaveBeenCalledWith(
        undefined,
        SpendStatus.APPROVED,
        undefined,
      );
    });

    it('should apply both filters and custom limit', async () => {
      mockSpendRequestsService.findAll.mockResolvedValue([]);

      await controller.findAll(10, SpendStatus.EXECUTED, 50);

      expect(service.findAll).toHaveBeenCalledWith(
        10,
        SpendStatus.EXECUTED,
        50,
      );
    });
  });

  describe('findByAccount', () => {
    it('should return all requests for specific account', async () => {
      const mockRequests = [
        { requestId: 1, accountId: 10 },
        { requestId: 2, accountId: 10 },
      ];

      mockSpendRequestsService.findByAccount.mockResolvedValue(mockRequests);

      const result = await controller.findByAccount(10);

      expect(service.findByAccount).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockRequests);
    });
  });

  describe('findOne', () => {
    it('should return single spend request by requestId', async () => {
      const mockRequest = {
        requestId: 1,
        accountId: 10,
        status: SpendStatus.EXECUTED,
      };

      mockSpendRequestsService.findOne.mockResolvedValue(mockRequest);

      const result = await controller.findOne(1);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockRequest);
    });

    it('should return null if request not found', async () => {
      mockSpendRequestsService.findOne.mockResolvedValue(null);

      const result = await controller.findOne(999);

      expect(result).toBeNull();
    });
  });

  // ==================== NEW WRITE OPERATIONS ====================

  describe('create', () => {
    it('should create spend request successfully', async () => {
      const createDto = {
        accountId: 1,
        amount: '1000000',
        chainId: 84532,
        destinationAddress: '0xDestination',
        description: 'Test spend request',
      };

      const mockUser = {
        address: '0xRequester',
      };

      const mockResult = {
        requestId: 15,
        transactionHash: '0xtxhash123',
      };

      mockSpendRequestsService.createRequest.mockResolvedValue(mockResult);

      const result = await controller.create(createDto, mockUser);

      expect(service.createRequest).toHaveBeenCalledWith(
        1,
        '1000000',
        84532,
        '0xDestination',
        'Test spend request',
        '0xRequester',
      );
      expect(result).toEqual(mockResult);
    });

    it('should pass user address from decorator', async () => {
      const createDto = {
        accountId: 5,
        amount: '2500000',
        chainId: 1,
        destinationAddress: '0xAnotherDestination',
        description: 'Cloud infrastructure costs',
      };

      const mockUser = {
        address: '0xUser123',
      };

      mockSpendRequestsService.createRequest.mockResolvedValue({
        requestId: 20,
        transactionHash: '0xtxhash456',
      });

      await controller.create(createDto, mockUser);

      expect(service.createRequest).toHaveBeenCalledWith(
        5,
        '2500000',
        1,
        '0xAnotherDestination',
        'Cloud infrastructure costs',
        '0xUser123',
      );
    });

    it('should handle empty description', async () => {
      const createDto = {
        accountId: 2,
        amount: '500000',
        chainId: 137,
        destinationAddress: '0xDest',
        description: '',
      };

      const mockUser = {
        address: '0xUser',
      };

      mockSpendRequestsService.createRequest.mockResolvedValue({
        requestId: 25,
        transactionHash: '0xtxhash789',
      });

      await controller.create(createDto, mockUser);

      expect(service.createRequest).toHaveBeenCalledWith(
        2,
        '500000',
        137,
        '0xDest',
        '',
        '0xUser',
      );
    });
  });

  describe('approve', () => {
    it('should approve spend request successfully', async () => {
      mockSpendRequestsService.approveRequest.mockResolvedValue(
        '0xtxhash101',
      );

      const result = await controller.approve(15);

      expect(service.approveRequest).toHaveBeenCalledWith(15);
      expect(result).toEqual({ transactionHash: '0xtxhash101' });
    });

    it('should handle different request IDs', async () => {
      mockSpendRequestsService.approveRequest.mockResolvedValue(
        '0xtxhash202',
      );

      const result = await controller.approve(999);

      expect(service.approveRequest).toHaveBeenCalledWith(999);
      expect(result).toEqual({ transactionHash: '0xtxhash202' });
    });
  });

  describe('reject', () => {
    it('should reject spend request with reason successfully', async () => {
      const rejectDto = {
        reason: 'Insufficient budget available',
      };

      mockSpendRequestsService.rejectRequest.mockResolvedValue(
        '0xtxhash303',
      );

      const result = await controller.reject(15, rejectDto);

      expect(service.rejectRequest).toHaveBeenCalledWith(
        15,
        'Insufficient budget available',
      );
      expect(result).toEqual({ transactionHash: '0xtxhash303' });
    });

    it('should handle different rejection reasons', async () => {
      const rejectDto = {
        reason: 'Account is frozen',
      };

      mockSpendRequestsService.rejectRequest.mockResolvedValue(
        '0xtxhash404',
      );

      const result = await controller.reject(20, rejectDto);

      expect(service.rejectRequest).toHaveBeenCalledWith(20, 'Account is frozen');
      expect(result).toEqual({ transactionHash: '0xtxhash404' });
    });

    it('should handle empty reason', async () => {
      const rejectDto = {
        reason: '',
      };

      mockSpendRequestsService.rejectRequest.mockResolvedValue(
        '0xtxhash505',
      );

      await controller.reject(25, rejectDto);

      expect(service.rejectRequest).toHaveBeenCalledWith(25, '');
    });

    it('should handle different request IDs', async () => {
      const rejectDto = {
        reason: 'Invalid request',
      };

      mockSpendRequestsService.rejectRequest.mockResolvedValue(
        '0xtxhash606',
      );

      const result = await controller.reject(999, rejectDto);

      expect(service.rejectRequest).toHaveBeenCalledWith(999, 'Invalid request');
      expect(result).toEqual({ transactionHash: '0xtxhash606' });
    });
  });
});

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
});

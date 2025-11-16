import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Repository } from 'typeorm';
import type { Queue } from 'bull';
import { SpendRequestsService } from './spend-requests.service';
import { SpendRequest } from '../entities/spend-request.entity';
import { SpendStatus } from '../../common/enums';
import type {
  SpendRequestedEvent,
  SpendApprovedEvent,
  SpendRejectedEvent,
  SpendExecutedEvent,
  SpendFailedEvent,
} from '../../blockchain/interfaces/treasury-events.interface';

describe('SpendRequestsService', () => {
  let service: SpendRequestsService;
  let repository: Repository<SpendRequest>;
  let queue: Queue;

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpendRequestsService,
        {
          provide: getRepositoryToken(SpendRequest),
          useValue: mockRepository,
        },
        {
          provide: getQueueToken('spend-execution'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<SpendRequestsService>(SpendRequestsService);
    repository = module.get<Repository<SpendRequest>>(
      getRepositoryToken(SpendRequest),
    );
    queue = module.get<Queue>(getQueueToken('spend-execution'));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleSpendRequested', () => {
    it('should create and save spend request with PENDING_APPROVAL status', async () => {
      const event: SpendRequestedEvent = {
        requestId: 1,
        accountId: 10,
        requesterAddress: '0xRequester',
        amount: '1000000',
        chainId: 1,
        destinationAddress: '0xDestination',
        description: 'Test spend',
        blockNumber: 12345,
        txHash: '0xtx123',
        timestamp: new Date(),
      };

      const mockSpendRequest = {
        id: 'uuid-123',
        requestId: 1,
        accountId: 10,
        requesterAddress: '0xrequester',
        amount: '1000000',
        chainId: 1,
        destinationAddress: '0xdestination',
        description: 'Test spend',
        status: SpendStatus.PENDING_APPROVAL,
        requestedAt: event.timestamp,
        txHash: '0xtx123',
      };

      mockRepository.create.mockReturnValue(mockSpendRequest);
      mockRepository.save.mockResolvedValue(mockSpendRequest);

      await service.handleSpendRequested(event);

      expect(mockRepository.create).toHaveBeenCalledWith({
        requestId: 1,
        accountId: 10,
        requesterAddress: '0xrequester',
        amount: '1000000',
        chainId: 1,
        destinationAddress: '0xdestination',
        description: 'Test spend',
        status: SpendStatus.PENDING_APPROVAL,
        requestedAt: event.timestamp,
        txHash: '0xtx123',
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockSpendRequest);
    });

    it('should lowercase addresses when creating spend request', async () => {
      const event: SpendRequestedEvent = {
        requestId: 2,
        accountId: 10,
        requesterAddress: '0xABCDEF',
        amount: '1000000',
        chainId: 1,
        destinationAddress: '0xDESTINATION',
        description: '',
        blockNumber: 12345,
        txHash: '0xtx123',
        timestamp: new Date(),
      };

      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      await service.handleSpendRequested(event);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requesterAddress: '0xabcdef',
          destinationAddress: '0xdestination',
        }),
      );
    });
  });

  describe('handleSpendApproved', () => {
    it('should update status to APPROVED and enqueue execution job', async () => {
      const event: SpendApprovedEvent = {
        requestId: 1,
        accountId: 10,
        approverAddress: '0xApprover',
        amount: '1000000',
        blockNumber: 12346,
        txHash: '0xtx124',
        timestamp: new Date(),
      };

      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockQueue.add.mockResolvedValue({});

      await service.handleSpendApproved(event);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { requestId: 1 },
        {
          status: SpendStatus.APPROVED,
          approvedAt: event.timestamp,
        },
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        'execute-spend',
        { requestId: 1 },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );
    });

    it('should configure queue job with retry settings', async () => {
      const event: SpendApprovedEvent = {
        requestId: 5,
        accountId: 10,
        approverAddress: '0xApprover',
        amount: '1000000',
        blockNumber: 12346,
        txHash: '0xtx124',
        timestamp: new Date(),
      };

      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockQueue.add.mockResolvedValue({});

      await service.handleSpendApproved(event);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'execute-spend',
        expect.any(Object),
        expect.objectContaining({
          attempts: 3,
          backoff: expect.objectContaining({
            type: 'exponential',
            delay: 5000,
          }),
        }),
      );
    });
  });

  describe('handleSpendRejected', () => {
    it('should update status to REJECTED with failure reason', async () => {
      const event: SpendRejectedEvent = {
        requestId: 1,
        accountId: 10,
        approverAddress: '0xApprover',
        reason: 'Insufficient budget',
        blockNumber: 12347,
        txHash: '0xtx125',
        timestamp: new Date(),
      };

      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.handleSpendRejected(event);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { requestId: 1 },
        {
          status: SpendStatus.REJECTED,
          failureReason: 'Insufficient budget',
        },
      );
    });
  });

  describe('handleSpendExecuted', () => {
    it('should update status to EXECUTED with gateway transaction details', async () => {
      const event: SpendExecutedEvent = {
        requestId: 1,
        accountId: 10,
        amount: '1000000',
        gatewayTxId: 'gw-tx-123',
        blockNumber: 12348,
        txHash: '0xtx126',
        timestamp: new Date(),
      };

      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.handleSpendExecuted(event);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { requestId: 1 },
        {
          status: SpendStatus.EXECUTED,
          gatewayTxId: 'gw-tx-123',
          transferId: 'gw-tx-123',
          executedAt: event.timestamp,
          treasuryTxHash: '0xtx126',
        },
      );
    });
  });

  describe('handleSpendFailed', () => {
    it('should update status to FAILED with failure reason', async () => {
      const event: SpendFailedEvent = {
        requestId: 1,
        accountId: 10,
        reason: 'Gateway timeout',
        blockNumber: 12349,
        txHash: '0xtx127',
        timestamp: new Date(),
      };

      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.handleSpendFailed(event);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { requestId: 1 },
        {
          status: SpendStatus.FAILED,
          failureReason: 'Gateway timeout',
        },
      );
    });
  });

  describe('findAll', () => {
    it('should find all spend requests without filters', async () => {
      const mockRequests = [
        { requestId: 1, status: SpendStatus.APPROVED },
        { requestId: 2, status: SpendStatus.PENDING_APPROVAL },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockRequests);

      const result = await service.findAll();

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('request');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'request.createdAt',
        'DESC',
      );
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(100);
      expect(result).toEqual(mockRequests);
    });

    it('should filter by accountId', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(10);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'request.accountId = :accountId',
        { accountId: 10 },
      );
    });

    it('should filter by status', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(undefined, SpendStatus.APPROVED);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'request.status = :status',
        { status: SpendStatus.APPROVED },
      );
    });

    it('should apply both accountId and status filters', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(10, SpendStatus.EXECUTED, 50);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
    });

    it('should use default limit of 100', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll();

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(100);
    });
  });

  describe('findOne', () => {
    it('should find spend request by requestId', async () => {
      const mockRequest = {
        requestId: 1,
        accountId: 10,
        status: SpendStatus.APPROVED,
      };

      mockRepository.findOne.mockResolvedValue(mockRequest);

      const result = await service.findOne(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { requestId: 1 },
      });
      expect(result).toEqual(mockRequest);
    });

    it('should return null if spend request not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe('findByAccount', () => {
    it('should find all spend requests for an account ordered by createdAt DESC', async () => {
      const mockRequests = [
        { requestId: 2, accountId: 10, createdAt: new Date('2024-01-02') },
        { requestId: 1, accountId: 10, createdAt: new Date('2024-01-01') },
      ];

      mockRepository.find.mockResolvedValue(mockRequests);

      const result = await service.findByAccount(10);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { accountId: 10 },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockRequests);
    });

    it('should return empty array if no requests for account', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findByAccount(999);

      expect(result).toEqual([]);
    });
  });
});

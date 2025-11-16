import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SpendExecutorService } from './spend-executor.service';
import { SpendRequest } from '../entities/spend-request.entity';
import { BurnIntentService } from '../../gateway/services/burn-intent.service';
import { GatewayApiService } from '../../gateway/services/gateway-api.service';
import { CrossChainMintService } from '../../gateway/services/cross-chain-mint.service';
import { TreasuryContractService } from '../../blockchain/services/treasury-contract.service';
import { SpendStatus } from '../../common/enums';
import { Repository } from 'typeorm';

describe('SpendExecutorService', () => {
  let service: SpendExecutorService;
  let spendRequestRepository: Repository<SpendRequest>;
  let burnIntentService: BurnIntentService;
  let gatewayApiService: GatewayApiService;
  let crossChainMintService: CrossChainMintService;
  let treasuryContractService: TreasuryContractService;

  const mockSpendRequestRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockBurnIntentService = {
    createAndSignBurnIntent: jest.fn(),
  };

  const mockGatewayApiService = {
    submitBurnIntent: jest.fn(),
  };

  const mockCrossChainMintService = {
    mintOnDestination: jest.fn(),
  };

  const mockTreasuryContractService = {
    markSpendExecuted: jest.fn(),
    markSpendFailed: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpendExecutorService,
        {
          provide: getRepositoryToken(SpendRequest),
          useValue: mockSpendRequestRepository,
        },
        {
          provide: BurnIntentService,
          useValue: mockBurnIntentService,
        },
        {
          provide: GatewayApiService,
          useValue: mockGatewayApiService,
        },
        {
          provide: CrossChainMintService,
          useValue: mockCrossChainMintService,
        },
        {
          provide: TreasuryContractService,
          useValue: mockTreasuryContractService,
        },
      ],
    }).compile();

    service = module.get<SpendExecutorService>(SpendExecutorService);
    spendRequestRepository = module.get<Repository<SpendRequest>>(
      getRepositoryToken(SpendRequest),
    );
    burnIntentService = module.get<BurnIntentService>(BurnIntentService);
    gatewayApiService = module.get<GatewayApiService>(GatewayApiService);
    crossChainMintService = module.get<CrossChainMintService>(
      CrossChainMintService,
    );
    treasuryContractService = module.get<TreasuryContractService>(
      TreasuryContractService,
    );

    jest.clearAllMocks();
  });

  describe('executeSpend', () => {
    const mockSpendRequest = {
      requestId: 1,
      accountId: 1,
      amount: '1000000',
      chainId: 84532,
      destinationAddress: '0x1234567890123456789012345678901234567890',
      status: SpendStatus.APPROVED,
    };

    it('should execute spend successfully', async () => {
      const mockBurnIntent = {
        burnIntent: {
          amount: '1000000',
          chainId: 84532,
          destinationAddress: '0x1234567890123456789012345678901234567890',
          expiryBlock: 2000,
          fee: '1000',
        },
        signature: '0xsignature',
      };

      const mockGatewayResponse = {
        transferId: 'transfer-123',
        attestation: '0xattestation',
      };

      mockSpendRequestRepository.findOne.mockResolvedValue(mockSpendRequest);
      mockSpendRequestRepository.update.mockResolvedValue({});
      mockBurnIntentService.createAndSignBurnIntent.mockResolvedValue(
        mockBurnIntent,
      );
      mockGatewayApiService.submitBurnIntent.mockResolvedValue(
        mockGatewayResponse,
      );
      mockCrossChainMintService.mintOnDestination.mockResolvedValue(
        '0xminttxhash',
      );
      mockTreasuryContractService.markSpendExecuted.mockResolvedValue(
        '0xexecutedtxhash',
      );

      await service.executeSpend(1);

      expect(mockSpendRequestRepository.findOne).toHaveBeenCalledWith({
        where: { requestId: 1 },
      });
      expect(mockSpendRequestRepository.update).toHaveBeenCalledWith(
        { requestId: 1 },
        { status: SpendStatus.EXECUTING },
      );
      expect(
        mockBurnIntentService.createAndSignBurnIntent,
      ).toHaveBeenCalledWith(
        '1000000',
        84532,
        '0x1234567890123456789012345678901234567890',
      );
      expect(mockGatewayApiService.submitBurnIntent).toHaveBeenCalledWith([
        mockBurnIntent,
      ]);
      expect(mockCrossChainMintService.mintOnDestination).toHaveBeenCalledWith(
        84532,
        '0xattestation',
      );
      expect(
        mockTreasuryContractService.markSpendExecuted,
      ).toHaveBeenCalledWith(1, 'transfer-123');
    });

    it('should throw error if spend request not found', async () => {
      mockSpendRequestRepository.findOne.mockResolvedValue(null);

      await expect(service.executeSpend(999)).rejects.toThrow(
        'Spend request 999 not found',
      );
    });

    it('should throw error if spend is not in APPROVED status', async () => {
      const rejectedRequest = {
        ...mockSpendRequest,
        status: SpendStatus.REJECTED,
      };

      mockSpendRequestRepository.findOne.mockResolvedValue(rejectedRequest);

      await expect(service.executeSpend(1)).rejects.toThrow(
        'Spend request 1 is not in APPROVED status',
      );
    });

    it('should allow EXECUTING status to retry', async () => {
      const executingRequest = {
        ...mockSpendRequest,
        status: SpendStatus.EXECUTING,
      };

      const mockBurnIntent = {
        burnIntent: {
          amount: '1000000',
          chainId: 84532,
          destinationAddress: '0x1234567890123456789012345678901234567890',
          expiryBlock: 2000,
          fee: '1000',
        },
        signature: '0xsignature',
      };

      const mockGatewayResponse = {
        transferId: 'transfer-123',
        attestation: '0xattestation',
      };

      mockSpendRequestRepository.findOne.mockResolvedValue(executingRequest);
      mockSpendRequestRepository.update.mockResolvedValue({});
      mockBurnIntentService.createAndSignBurnIntent.mockResolvedValue(
        mockBurnIntent,
      );
      mockGatewayApiService.submitBurnIntent.mockResolvedValue(
        mockGatewayResponse,
      );
      mockCrossChainMintService.mintOnDestination.mockResolvedValue(
        '0xminttxhash',
      );
      mockTreasuryContractService.markSpendExecuted.mockResolvedValue(
        '0xexecutedtxhash',
      );

      await service.executeSpend(1);

      expect(mockBurnIntentService.createAndSignBurnIntent).toHaveBeenCalled();
    });

    it('should mark spend as failed on error', async () => {
      mockSpendRequestRepository.findOne.mockResolvedValue(mockSpendRequest);
      mockSpendRequestRepository.update.mockResolvedValue({});
      mockBurnIntentService.createAndSignBurnIntent.mockRejectedValue(
        new Error('Network error'),
      );
      mockTreasuryContractService.markSpendFailed.mockResolvedValue(
        '0xfailedtxhash',
      );

      await expect(service.executeSpend(1)).rejects.toThrow('Network error');
      expect(mockTreasuryContractService.markSpendFailed).toHaveBeenCalledWith(
        1,
        expect.stringContaining('Network error'),
      );
    });
  });
});
